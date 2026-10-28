package expo.modules.cardocr

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.atan2
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

// Finds a card's edges in a photo, the Android stand-in for Vision's rectangle detection on iOS.
// Works on a small grayscale copy: edges (Sobel, thinned), straight lines near horizontal and near
// vertical (Hough), then the pair of each that makes the best-supported card-shaped quadrilateral.
//
// Plain Kotlin on an array of luma values, so it runs in a JVM unit test without a device.
internal object CardEdgeDetector {
  // The long edge of the copy the work is done on. Enough to place a card's edges to within a percent.
  const val WORK_EDGE = 480

  // How far a card's sides may lean from upright, from the card being turned or shot at an angle.
  private const val MAX_TILT = 20
  // An edge pixel votes for line angles this many degrees either side of its own. Wide, because the
  // direction Sobel reads off a slanted edge wanders with the pixel steps along it.
  private const val VOTE_SPREAD = 6
  // An ID-1 card is 85.6 × 54 mm (short side / long side ≈ 0.63); allow for perspective. Same as iOS.
  private const val MIN_ASPECT = 0.45
  private const val MAX_ASPECT = 0.8
  // Corners may be this many degrees off square.
  private const val CORNER_TOLERANCE = 20.0
  // The card's short side, as a share of the photo's short side.
  private const val MIN_SIZE = 0.25
  // Weakest edge strength that counts, on Sobel's scale (a step of about 10 levels).
  private const val MIN_EDGE = 40
  // Card corners are rounded: a side's support is measured away from its ends.
  private const val CORNER_SKIP = 0.08
  // A side must have edge pixels along this share of its length, and the four together on average more.
  // High, because a wrong find that cuts into the card is worse than none: the cropper can only
  // shrink what it is given. A row of printed text gives a broken line and falls short.
  private const val MIN_SIDE_SUPPORT = 0.65
  private const val MIN_MEAN_SUPPORT = 0.75
  // A card's sides stop at its corners. Past each corner, along this share of the side's length, the
  // side's edge must mostly be gone; otherwise the "side" is part of a longer edge, as when a box
  // printed on the card borrows the card's own bottom edge.
  private const val OVERRUN = 0.2
  private const val MAX_OVERRUN_SUPPORT = 0.5
  // An edge pixel only supports a side when its own direction is within this many degrees of the side's.
  private const val ANGLE_MATCH = 12f
  private const val MAX_LINES = 12

  class Box(val x: Double, val y: Double, val width: Double, val height: Double)

  private class Line(val theta: Double, val rho: Double)

  private class Point(val x: Double, val y: Double)

  // Per pixel: the kind of line an edge could belong to (0 for no edge), and the edge's normal angle.
  private class EdgeMap(val kinds: ByteArray, val angles: FloatArray)

  private const val HORIZONTAL: Byte = 1
  private const val VERTICAL: Byte = 2

  // `channels` are the photo's colour channels (or just one, grey), each row-major, 0–255. The box is
  // normalised, origin top left, or null when no card is found.
  fun detect(channels: List<IntArray>, width: Int, height: Int): Box? {
    if (width < 16 || height < 16) return null
    val edges = edgeMap(channels.map { blur(it, width, height) }, width, height)

    val diagonal = ceil(hypot(width.toDouble(), height.toDouble())).toInt()
    val minSide = MIN_SIZE * min(width, height)
    val minVotes = (minSide * 0.4).toInt()
    val horizontals = lines(edges, width, height, diagonal, HORIZONTAL, minVotes)
    val verticals = lines(edges, width, height, diagonal, VERTICAL, minVotes)

    var best: List<Point>? = null
    var bestScore = 0.0
    for (i in horizontals.indices) for (j in horizontals.indices) {
      if (horizontals[j].rho - horizontals[i].rho < minSide) continue
      val top = horizontals[i]
      val bottom = horizontals[j]
      for (k in verticals.indices) for (l in verticals.indices) {
        if (verticals[l].rho - verticals[k].rho < minSide) continue
        val left = verticals[k]
        val right = verticals[l]
        val corners = listOf(
          intersect(top, left) ?: continue,
          intersect(top, right) ?: continue,
          intersect(bottom, right) ?: continue,
          intersect(bottom, left) ?: continue,
        )
        val score = score(corners, edges, width, height, minSide) ?: continue
        if (score > bestScore) {
          bestScore = score
          best = corners
        }
      }
    }

    val corners = best ?: return null
    val left = corners.minOf { it.x }.coerceIn(0.0, width.toDouble())
    val right = corners.maxOf { it.x }.coerceIn(0.0, width.toDouble())
    val top = corners.minOf { it.y }.coerceIn(0.0, height.toDouble())
    val bottom = corners.maxOf { it.y }.coerceIn(0.0, height.toDouble())
    return Box(left / width, top / height, (right - left) / width, (bottom - top) / height)
  }

  // 5×5 Gaussian, separable, so fine texture (paper grain, sensor noise) doesn't read as edges.
  private fun blur(src: IntArray, w: Int, h: Int): IntArray {
    val kernel = intArrayOf(1, 4, 6, 4, 1)
    val pass = IntArray(src.size)
    for (y in 0 until h) for (x in 0 until w) {
      var sum = 0
      for (k in -2..2) sum += kernel[k + 2] * src[y * w + (x + k).coerceIn(0, w - 1)]
      pass[y * w + x] = sum
    }
    val out = IntArray(src.size)
    for (y in 0 until h) for (x in 0 until w) {
      var sum = 0
      for (k in -2..2) sum += kernel[k + 2] * pass[(y + k).coerceIn(0, h - 1) * w + x]
      out[y * w + x] = sum / 256
    }
    return out
  }

  // Thinned Sobel edges. Each pixel takes the channel that changes most, so a blue card on brown wood
  // shows its edge even where the two are the same brightness.
  private fun edgeMap(channels: List<IntArray>, w: Int, h: Int): EdgeMap {
    val size = w * h
    val magnitude = FloatArray(size)
    val angle = FloatArray(size)
    for (y in 1 until h - 1) for (x in 1 until w - 1) {
      val i = y * w + x
      for (src in channels) {
        val gx = src[i - w + 1] + 2 * src[i + 1] + src[i + w + 1] - src[i - w - 1] - 2 * src[i - 1] - src[i + w - 1]
        val gy = src[i + w - 1] + 2 * src[i + w] + src[i + w + 1] - src[i - w - 1] - 2 * src[i - w] - src[i - w + 1]
        val m = hypot(gx.toFloat(), gy.toFloat())
        if (m <= magnitude[i]) continue
        magnitude[i] = m
        // The direction across the edge, folded into 0–180°.
        angle[i] = ((Math.toDegrees(atan2(gy.toDouble(), gx.toDouble())) + 180.0) % 180.0).toFloat()
      }
    }

    // Busy backgrounds raise the bar, so only the stronger edges in the photo count.
    val threshold = max(MIN_EDGE.toFloat(), percentile(magnitude, 0.8))
    val edges = ByteArray(size)
    for (y in 1 until h - 1) for (x in 1 until w - 1) {
      val i = y * w + x
      val m = magnitude[i]
      if (m < threshold) continue
      val a = angle[i]
      // Keep only the peak across the edge, so each edge is one pixel wide.
      val step = when {
        a < 22.5f || a >= 157.5f -> 1
        a < 67.5f -> w + 1
        a < 112.5f -> w
        else -> w - 1
      }
      if (m < magnitude[i - step] || m < magnitude[i + step]) continue
      edges[i] = when {
        abs(a - 90f) <= MAX_TILT + VOTE_SPREAD -> HORIZONTAL
        a <= MAX_TILT + VOTE_SPREAD || a >= 180f - MAX_TILT - VOTE_SPREAD -> VERTICAL
        else -> 0
      }
    }
    return EdgeMap(edges, angle)
  }

  private fun percentile(values: FloatArray, share: Double): Float {
    val bins = IntArray(1024)
    for (v in values) bins[min(v.toInt(), bins.size - 1)]++
    val target = (values.size * share).toInt()
    var seen = 0
    for (b in bins.indices) {
      seen += bins[b]
      if (seen > target) return b.toFloat()
    }
    return bins.size.toFloat()
  }

  // The strongest straight lines of one kind, as normal angle θ and distance ρ (x·cosθ + y·sinθ = ρ).
  // Vertical lines have θ near 0°, horizontal ones near 90°; ρ then grows left to right and top to bottom.
  private fun lines(edges: EdgeMap, w: Int, h: Int, diagonal: Int, kind: Byte, minVotes: Int): List<Line> {
    val centre = if (kind == HORIZONTAL) 90 else 0
    val angles = 2 * MAX_TILT + 1
    val rhos = 2 * diagonal + 1
    val votes = IntArray(angles * rhos)
    val cosines = DoubleArray(angles) { cos(Math.toRadians((centre - MAX_TILT + it).toDouble())) }
    val sines = DoubleArray(angles) { sin(Math.toRadians((centre - MAX_TILT + it).toDouble())) }

    for (y in 0 until h) for (x in 0 until w) {
      if (edges.kinds[y * w + x] != kind) continue
      // Only angles near the edge's own direction: the pixel can't lie on a line it runs across.
      // Sobel's direction is the line's normal; vertical lines fold to either side of 0°.
      val a = edges.angles[y * w + x]
      val own = if (kind == VERTICAL && a > 90f) (a - 180f).roundToInt() else a.roundToInt()
      val from = max(0, own - centre + MAX_TILT - VOTE_SPREAD)
      val to = min(angles - 1, own - centre + MAX_TILT + VOTE_SPREAD)
      for (t in from..to) {
        val rho = (x * cosines[t] + y * sines[t]).roundToInt() + diagonal
        votes[t * rhos + rho]++
      }
    }

    val found = mutableListOf<Line>()
    val order = votes.indices.filter { votes[it] >= minVotes }.sortedByDescending { votes[it] }
    for (cell in order) {
      val theta = (centre - MAX_TILT + cell / rhos).toDouble()
      val rho = (cell % rhos - diagonal).toDouble()
      // The same edge shows up in neighbouring cells; keep the strongest.
      if (found.any { abs(it.theta - theta) <= 6 && abs(it.rho - rho) <= 8 }) continue
      found += Line(theta, rho)
      if (found.size == MAX_LINES) break
    }
    return found
  }

  private fun intersect(a: Line, b: Line): Point? {
    val ta = Math.toRadians(a.theta)
    val tb = Math.toRadians(b.theta)
    val det = cos(ta) * sin(tb) - sin(ta) * cos(tb)
    if (abs(det) < 1e-6) return null
    return Point((a.rho * sin(tb) - b.rho * sin(ta)) / det, (b.rho * cos(ta) - a.rho * cos(tb)) / det)
  }

  // How well four corners (clockwise from top left) make a card: null when they can't be one, else
  // the side lengths weighted by how much of each side has an edge under it. Larger cards win ties,
  // which errs towards a crop with room to spare rather than one cutting into the card.
  private fun score(corners: List<Point>, edges: EdgeMap, w: Int, h: Int, minSide: Double): Double? {
    val slack = 0.02 * max(w, h)
    if (corners.any { it.x < -slack || it.y < -slack || it.x > w + slack || it.y > h + slack }) return null

    for (i in 0 until 4) {
      val corner = corners[i]
      val previous = corners[(i + 3) % 4]
      val next = corners[(i + 1) % 4]
      if (abs(angleAt(corner, previous, next) - 90.0) > CORNER_TOLERANCE) return null
    }

    val lengths = (0 until 4).map { distance(corners[it], corners[(it + 1) % 4]) }
    val across = (lengths[0] + lengths[2]) / 2
    val down = (lengths[1] + lengths[3]) / 2
    if (min(across, down) < minSide) return null
    val aspect = min(across, down) / max(across, down)
    if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) return null

    var total = 0.0
    var supportSum = 0.0
    for (i in 0 until 4) {
      val kind = if (i % 2 == 0) HORIZONTAL else VERTICAL
      val a = corners[i]
      val b = corners[(i + 1) % 4]
      val support = support(a, b, kind, edges, w, h, CORNER_SKIP, 1 - CORNER_SKIP)
      if (support < MIN_SIDE_SUPPORT) return null
      // Past the corners; starting a little out, clear of the corner's curve.
      if (support(a, b, kind, edges, w, h, -OVERRUN, -CORNER_SKIP) > MAX_OVERRUN_SUPPORT) return null
      if (support(a, b, kind, edges, w, h, 1 + CORNER_SKIP, 1 + OVERRUN) > MAX_OVERRUN_SUPPORT) return null
      supportSum += support
      total += support * lengths[i]
    }
    if (supportSum / 4 < MIN_MEAN_SUPPORT) return null
    return total
  }

  // The share of points on the line through a and b, from `from` to `to` (0 at a, 1 at b), with an
  // edge running the same way within two pixels across it. Points outside the photo count as no edge.
  private fun support(a: Point, b: Point, kind: Byte, edges: EdgeMap, w: Int, h: Int, from: Double, to: Double): Double {
    val steps = (distance(a, b) * (to - from)).toInt()
    if (steps < 2) return 0.0
    // The side's normal, folded into 0–180° like the edge angles.
    val normal = ((Math.toDegrees(atan2(b.y - a.y, b.x - a.x)) + 90.0 + 360.0) % 180.0).toFloat()
    var hits = 0
    var samples = 0
    for (s in 0..steps) {
      val t = from + (to - from) * s / steps
      val x = (a.x + (b.x - a.x) * t).roundToInt()
      val y = (a.y + (b.y - a.y) * t).roundToInt()
      samples++
      for (d in -2..2) {
        val px = if (kind == VERTICAL) x + d else x
        val py = if (kind == HORIZONTAL) y + d else y
        val i = py * w + px
        if (px !in 0 until w || py !in 0 until h || edges.kinds[i] != kind) continue
        val off = abs(edges.angles[i] - normal)
        if (min(off, 180f - off) <= ANGLE_MATCH) {
          hits++
          break
        }
      }
    }
    return if (samples == 0) 0.0 else hits.toDouble() / samples
  }

  private fun angleAt(corner: Point, a: Point, b: Point): Double {
    val ax = a.x - corner.x
    val ay = a.y - corner.y
    val bx = b.x - corner.x
    val by = b.y - corner.y
    val cosine = (ax * bx + ay * by) / (hypot(ax, ay) * hypot(bx, by))
    return acos(cosine.coerceIn(-1.0, 1.0)) * 180 / PI
  }

  private fun distance(a: Point, b: Point) = hypot(b.x - a.x, b.y - a.y)
}

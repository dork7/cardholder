package expo.modules.cardocr

import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.random.Random

// Synthetic photos: a light card (ID-1 shape, rounded corners, some printed blocks) on a darker
// background, drawn straight into a luma array.
class CardEdgeDetectorTest {
  private val w = 480
  private val h = 360

  private class Pt(val x: Double, val y: Double)

  private fun photo(background: (Int, Int) -> Int = { _, _ -> 70 }) = IntArray(w * h) { background(it % w, it / w) }

  // Fills the quad (clockwise from top left) with the card, cutting its corners round by `radius`
  // of the short side, and prints a photo box and lines of "text" inside it, under a coloured header
  // band when `header` is given. Each pixel averages 3×3
  // samples, so slanted edges are smooth as in a real photo rather than hard steps.
  private fun drawCard(img: IntArray, q: List<Pt>, shade: Int = 215, radius: Double = 0.06, header: Int? = null) {
    val short = hypot(q[3].x - q[0].x, q[3].y - q[0].y)
    val len = hypot(q[1].x - q[0].x, q[1].y - q[0].y)
    val r = radius * short
    fun cardAt(x: Double, y: Double): Int? {
      val (u, v) = toCard(q, x, y) ?: return null
      val du = maxOf(r - u * len, u * len - (len - r), 0.0)
      val dv = maxOf(r - v * short, v * short - (short - r), 0.0)
      if (hypot(du, dv) > r) return null
      if (header != null && v < 0.22) return header
      if (u in 0.06..0.30 && v in 0.25..0.85) return 120 // photo
      // Rows of text: letters with gaps between them, words with wider ones.
      val inRow = (((v - 0.3) * 10).toInt() in 0..5) && ((v * 10) % 1.0 < 0.45)
      val letter = (u * 60) % 1.0 < 0.6 && (u * 8) % 1.0 < 0.85
      if (u in 0.38..0.92 && inRow && letter) return 60
      return shade
    }
    val xs = q.map { it.x }
    val ys = q.map { it.y }
    for (y in max(0, ys.min().toInt() - 1)..min(h - 1, ys.max().toInt() + 1)) {
      for (x in max(0, xs.min().toInt() - 1)..min(w - 1, xs.max().toInt() + 1)) {
        var sum = 0
        var inside = 0
        for (sy in 0 until 3) for (sx in 0 until 3) {
          val value = cardAt(x + (sx + 0.5) / 3, y + (sy + 0.5) / 3) ?: continue
          sum += value
          inside++
        }
        if (inside > 0) img[y * w + x] = (sum + (9 - inside) * img[y * w + x]) / 9
      }
    }
  }

  // Inverse bilinear for a near-parallelogram: where (x, y) falls in the card, 0–1 each way, or null.
  private fun toCard(q: List<Pt>, x: Double, y: Double): Pair<Double, Double>? {
    var u = 0.5
    var v = 0.5
    repeat(12) {
      val px = (1 - u) * (1 - v) * q[0].x + u * (1 - v) * q[1].x + u * v * q[2].x + (1 - u) * v * q[3].x
      val py = (1 - u) * (1 - v) * q[0].y + u * (1 - v) * q[1].y + u * v * q[2].y + (1 - u) * v * q[3].y
      val dxu = (1 - v) * (q[1].x - q[0].x) + v * (q[2].x - q[3].x)
      val dyu = (1 - v) * (q[1].y - q[0].y) + v * (q[2].y - q[3].y)
      val dxv = (1 - u) * (q[3].x - q[0].x) + u * (q[2].x - q[1].x)
      val dyv = (1 - u) * (q[3].y - q[0].y) + u * (q[2].y - q[1].y)
      val det = dxu * dyv - dxv * dyu
      val ex = x - px
      val ey = y - py
      u += (ex * dyv - ey * dxv) / det
      v += (ey * dxu - ex * dyu) / det
    }
    return if (u in 0.0..1.0 && v in 0.0..1.0) u to v else null
  }

  private fun rect(cx: Double, cy: Double, long: Double, angleDeg: Double): List<Pt> {
    val short = long * 54 / 85.6
    val a = Math.toRadians(angleDeg)
    val ux = cos(a)
    val uy = sin(a)
    val vx = -uy
    val vy = ux
    fun corner(su: Double, sv: Double) = Pt(cx + su * long / 2 * ux + sv * short / 2 * vx, cy + su * long / 2 * uy + sv * short / 2 * vy)
    return listOf(corner(-1.0, -1.0), corner(1.0, -1.0), corner(1.0, 1.0), corner(-1.0, 1.0))
  }

  // The box must hold the whole card (the cropper can't grow it back), with only a little room to spare.
  private fun assertBoxAround(q: List<Pt>, box: CardEdgeDetector.Box?) {
    assertNotNull("no card found", box)
    box!!
    val inside = 0.015
    val outside = 0.05
    // Positive room: the box edge is outside the card.
    val sides = listOf(
      "left" to q.minOf { it.x } / w - box.x,
      "top" to q.minOf { it.y } / h - box.y,
      "right" to box.x + box.width - q.maxOf { it.x } / w,
      "bottom" to box.y + box.height - q.maxOf { it.y } / h,
    )
    for ((name, room) in sides) {
      assertTrue("$name cuts into the card by $room", room >= -inside)
      assertTrue("$name leaves $room spare", room <= outside)
    }
  }

  @Test
  fun findsAnUprightCard() {
    val img = photo()
    val q = rect(250.0, 170.0, 300.0, 0.0)
    drawCard(img, q)
    assertBoxAround(q, CardEdgeDetector.detect(listOf(img), w, h))
  }

  @Test
  fun findsATurnedCard() {
    val img = photo()
    val q = rect(230.0, 185.0, 280.0, 12.0)
    drawCard(img, q)
    assertBoxAround(q, CardEdgeDetector.detect(listOf(img), w, h))
  }

  @Test
  fun findsACardShotAtAnAngle() {
    val img = photo()
    // Further edge narrower and the card squashed top to bottom, as when the phone leans back.
    val q = listOf(Pt(130.0, 110.0), Pt(360.0, 116.0), Pt(395.0, 270.0), Pt(95.0, 262.0))
    drawCard(img, q)
    assertBoxAround(q, CardEdgeDetector.detect(listOf(img), w, h))
  }

  @Test
  fun findsACardOnABusyBackground() {
    // Wood: wavy grain, darker knots and noise.
    val random = Random(7)
    val knots = List(6) { Pt(random.nextDouble(w.toDouble()), random.nextDouble(h.toDouble())) }
    val img = photo { x, y ->
      val grain = 22 * sin(y * 0.11 + 4 * sin(x * 0.013)) + 9 * sin(y * 0.37 + x * 0.02)
      val knot = knots.sumOf { k -> 40 * exp(-hypot(x - k.x, (y - k.y) * 2) / 12) }
      (95 + grain - knot).toInt() + random.nextInt(-12, 13)
    }
    val q = rect(240.0, 180.0, 290.0, -7.0)
    drawCard(img, q)
    for (i in img.indices) img[i] = (img[i] + random.nextInt(-8, 9)).coerceIn(0, 255)
    assertBoxAround(q, CardEdgeDetector.detect(listOf(img), w, h))
  }

  @Test
  fun neverCutsIntoACardOnAFineGrid() {
    // Small tiles lined up with the card put edges along every line through its sides, so the card
    // may well not be found (the crop then starts from the whole photo); it must never be cut into.
    val random = Random(7)
    val img = photo { x, y -> 50 + ((x / 9 + y / 13) % 2) * 25 + random.nextInt(-12, 13) }
    val q = rect(240.0, 180.0, 290.0, -7.0)
    drawCard(img, q)
    val box = CardEdgeDetector.detect(listOf(img), w, h)
    if (box != null) assertBoxAround(q, box)
  }

  @Test
  fun findsALowContrastCard() {
    val img = photo { _, _ -> 175 }
    val q = rect(240.0, 180.0, 300.0, 4.0)
    drawCard(img, q, shade = 205)
    assertBoxAround(q, CardEdgeDetector.detect(listOf(img), w, h))
  }

  @Test
  fun neverCutsIntoACardWhoseTopFadesIntoTheBackground() {
    // A white card on a white sheet that only covers the top of the photo: no top edge to find, while
    // the rows of text still make lines across the card. Finding nothing is fine; cutting into it isn't.
    val img = photo { _, y -> if (y < 150) 215 else 70 }
    val q = rect(240.0, 180.0, 300.0, 0.0)
    drawCard(img, q)
    val box = CardEdgeDetector.detect(listOf(img), w, h)
    if (box != null) assertBoxAround(q, box)
  }

  @Test
  fun findsACardWhoseHeaderMatchesTheTableInBrightness() {
    // Seen on a device: a blue header band on brown wood. In grey the card's top edge all but
    // vanishes, and the line under the header looks like the top of a card; in colour it is plain.
    val random = Random(5)
    val wood = intArrayOf(140, 95, 60)
    val body = intArrayOf(238, 236, 230)
    val blue = intArrayOf(30, 90, 160)
    val q = rect(240.0, 175.0, 300.0, 5.0)
    val grain = IntArray(w * h) { (18 * sin((it / w) * 0.09 + 3 * sin((it % w) * 0.01))).toInt() + random.nextInt(-6, 7) }
    val channels = (0 until 3).map { c ->
      val img = IntArray(w * h) { (wood[c] + grain[it]).coerceIn(0, 255) }
      drawCard(img, q, shade = body[c], header = blue[c])
      img
    }
    assertBoxAround(q, CardEdgeDetector.detect(channels, w, h))
  }

  @Test
  fun nothingInAnEmptyPhoto() {
    val random = Random(3)
    assertNull(CardEdgeDetector.detect(listOf(photo { _, _ -> 90 + random.nextInt(-10, 11) }), w, h))
  }

  @Test
  fun nothingWhenTheShapeIsNotACard() {
    // A square: wrong shape for an ID-1 card.
    val img = photo()
    for (y in 80 until 280) for (x in 140 until 340) img[y * w + x] = 215
    assertNull(CardEdgeDetector.detect(listOf(img), w, h))
  }

  @Test
  fun nothingWhenTheCardIsTiny() {
    val img = photo()
    val q = rect(240.0, 180.0, 70.0, 0.0)
    drawCard(img, q)
    assertNull(CardEdgeDetector.detect(listOf(img), w, h))
  }
}

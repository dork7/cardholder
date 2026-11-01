package expo.modules.homewidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

// The pinned cards widget. It shows only what the app last saved (HomeWidgetModule.update): names
// and a short note, never a card's picture, and nothing but "Locked" while app lock is on. Each row
// opens its card through the app's own link, so app lock still asks first. What it keeps is sealed
// with a key in the Android Keystore, like everything else Doc Keeper keeps about a card.
class CardsWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, widgetIds: IntArray) {
    for (id in widgetIds) manager.updateAppWidget(id, render(context, id))
  }

  companion object {
    private const val PREFS = "doc_keeper_widget"
    private const val KEY = "state"
    private const val KEY_ALIAS = "doc_keeper_widget"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val IV_BYTES = 12
    private val ROWS = listOf(
      Triple(R.id.doc_keeper_row_0, R.id.doc_keeper_name_0, R.id.doc_keeper_note_0),
      Triple(R.id.doc_keeper_row_1, R.id.doc_keeper_name_1, R.id.doc_keeper_note_1),
      Triple(R.id.doc_keeper_row_2, R.id.doc_keeper_name_2, R.id.doc_keeper_note_2),
      Triple(R.id.doc_keeper_row_3, R.id.doc_keeper_name_3, R.id.doc_keeper_note_3),
    )
    // Card ids are random hex from the app; anything else is never put in a link.
    private val CARD_ID = Regex("^[A-Za-z0-9_-]{1,64}$")

    fun save(context: Context, json: String) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, seal(json)).apply()
    }

    private fun load(context: Context): JSONObject? {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val sealed = prefs.getString(KEY, null) ?: return null
      // Anything unreadable (e.g. left unsealed by 1.0.9) is dropped; the app saves it again when it next opens.
      return runCatching { JSONObject(open(sealed)) }.getOrElse {
        prefs.edit().remove(KEY).apply()
        null
      }
    }

    private fun seal(text: String): String {
      val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, key()) }
      return Base64.encodeToString(cipher.iv + cipher.doFinal(text.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
    }

    private fun open(sealed: String): String {
      val bytes = Base64.decode(sealed, Base64.NO_WRAP)
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes, 0, IV_BYTES))
      return String(cipher.doFinal(bytes, IV_BYTES, bytes.size - IV_BYTES), Charsets.UTF_8)
    }

    private fun key(): SecretKey {
      val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
      (store.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
      val spec = KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .build()
      return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply { init(spec) }.generateKey()
    }

    fun redrawAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, CardsWidgetProvider::class.java))
      for (id in ids) manager.updateAppWidget(id, render(context, id))
    }

    private fun render(context: Context, widgetId: Int): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.doc_keeper_cards_widget)
      val state = load(context)
      val locked = state?.optBoolean("locked", false) ?: false
      val cards = if (locked) null else state?.optJSONArray("cards")

      views.setOnClickPendingIntent(R.id.doc_keeper_widget, openApp(context, widgetId))
      views.setOnClickPendingIntent(R.id.doc_keeper_add, link(context, "cardholder://edit/new", widgetId * 10 + 9))

      val count = minOf(cards?.length() ?: 0, ROWS.size)
      views.setViewVisibility(R.id.doc_keeper_message, if (count == 0) View.VISIBLE else View.GONE)
      views.setTextViewText(
        R.id.doc_keeper_message,
        context.getString(if (locked) R.string.doc_keeper_widget_locked else R.string.doc_keeper_widget_empty),
      )
      ROWS.forEachIndexed { i, (row, name, note) ->
        val card = if (i < count) cards?.optJSONObject(i) else null
        val id = card?.optString("id").orEmpty()
        if (card == null || !CARD_ID.matches(id)) {
          views.setViewVisibility(row, View.GONE)
          return@forEachIndexed
        }
        views.setViewVisibility(row, View.VISIBLE)
        views.setTextViewText(name, card.optString("name"))
        views.setTextViewText(note, card.optString("note"))
        val color = if (card.optBoolean("warn")) R.color.doc_keeper_widget_danger else R.color.doc_keeper_widget_muted
        views.setTextColor(note, context.getColor(color))
        views.setOnClickPendingIntent(row, link(context, "cardholder://card/$id", widgetId * 10 + i))
      }
      return views
    }

    // Opens a screen in this app by its link; expo-router takes it from there.
    private fun link(context: Context, url: String, requestCode: Int): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        .setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    private fun openApp(context: Context, widgetId: Int): PendingIntent {
      val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: Intent(Intent.ACTION_VIEW, Uri.parse("cardholder://")).setPackage(context.packageName)
      return PendingIntent.getActivity(context, widgetId * 10 + 8, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
  }
}

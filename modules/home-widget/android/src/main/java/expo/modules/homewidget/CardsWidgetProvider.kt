package expo.modules.homewidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

// The pinned cards widget. It shows only what the app last saved (HomeWidgetModule.update): names
// and a short note, never a card's picture, and nothing but "Locked" while app lock is on. Each row
// opens its card through the app's own link, so app lock still asks first.
class CardsWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, widgetIds: IntArray) {
    for (id in widgetIds) manager.updateAppWidget(id, render(context, id))
  }

  companion object {
    private const val PREFS = "doc_keeper_widget"
    private const val KEY = "state"
    private val ROWS = listOf(
      Triple(R.id.doc_keeper_row_0, R.id.doc_keeper_name_0, R.id.doc_keeper_note_0),
      Triple(R.id.doc_keeper_row_1, R.id.doc_keeper_name_1, R.id.doc_keeper_note_1),
      Triple(R.id.doc_keeper_row_2, R.id.doc_keeper_name_2, R.id.doc_keeper_note_2),
      Triple(R.id.doc_keeper_row_3, R.id.doc_keeper_name_3, R.id.doc_keeper_note_3),
    )
    // Card ids are random hex from the app; anything else is never put in a link.
    private val CARD_ID = Regex("^[A-Za-z0-9_-]{1,64}$")

    fun save(context: Context, json: String) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
    }

    fun redrawAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, CardsWidgetProvider::class.java))
      for (id in ids) manager.updateAppWidget(id, render(context, id))
    }

    private fun render(context: Context, widgetId: Int): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.doc_keeper_cards_widget)
      val state = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
        ?.let { runCatching { JSONObject(it) }.getOrNull() }
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

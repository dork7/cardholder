package expo.modules.homewidget

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// The app tells the widget what to show (src/widget/homeWidget.ts) whenever the pinned cards or app
// lock change; the widget keeps it and redraws.
class HomeWidgetModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("HomeWidget")

    // `json` is {"locked": boolean, "cards": [{"id", "name", "note", "warn"}]}.
    Function("update") { json: String ->
      CardsWidgetProvider.save(context, json)
      CardsWidgetProvider.redrawAll(context)
    }
  }
}

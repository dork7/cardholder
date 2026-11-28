package expo.modules.profilecontactpicker

import android.app.Activity
import android.content.Intent
import android.provider.ContactsContract
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val REQUEST_CODE = 0x0D0D

class ProfileContactPickerModule : Module() {
  private var pending: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("ProfileContactPicker")

    AsyncFunction("pickContact") { promise: Promise ->
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      pending?.resolve(null)
      pending = promise
      try {
        activity.startActivityForResult(Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI), REQUEST_CODE)
      } catch (e: Exception) {
        pending = null
        promise.reject("E_CONTACT_PICKER", "Could not open contacts", e)
      }
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST_CODE) return@OnActivityResult
      val promise = pending ?: return@OnActivityResult
      pending = null
      val uri = payload.data?.data
      if (payload.resultCode != Activity.RESULT_OK || uri == null) {
        promise.resolve(null)
        return@OnActivityResult
      }
      try {
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        context.contentResolver.query(uri, arrayOf(
          ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
          ContactsContract.CommonDataKinds.Phone.NUMBER), null, null, null)?.use { cursor ->
          if (cursor.moveToFirst()) {
            val name = cursor.getString(0)?.trim().orEmpty().take(200)
            val phone = cursor.getString(1)?.trim().orEmpty().take(200)
            promise.resolve(if (name.isNotEmpty() && phone.isNotEmpty()) mapOf("name" to name, "phone" to phone) else null)
          } else promise.resolve(null)
        } ?: promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("E_CONTACT_PICKER", "Could not read selected contact", e)
      }
    }
  }
}

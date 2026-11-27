package expo.modules.googledriveauth

import android.app.Activity
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.api.Scope
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val DRIVE_FILE = "https://www.googleapis.com/auth/drive.file"
private const val REQUEST_CODE = 0x6B44 // "kD"

private class AuthException(message: String, cause: Throwable?) : CodedException("E_AUTH", message, cause)

// Access tokens for Drive backup (ADR-0010). The TypeScript side (src/backup/drive/) talks to the
// Drive REST API with the token; this only asks Play services for it. No account details, files or
// passphrases pass through here.
//
// authorize(interactive) resolves one of:
//   { status: "ok", accessToken }   granted, token ready
//   { status: "needs-consent" }     not granted yet or revoked; only when interactive is false
//   { status: "cancelled" }         the user closed the account chooser or consent screen
class GoogleDriveAuthModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()
  private var pending: Promise? = null

  private fun request() = AuthorizationRequest.builder()
    .setRequestedScopes(listOf(Scope(DRIVE_FILE)))
    .build()

  private fun ok(result: AuthorizationResult): Map<String, Any?> {
    val token = result.accessToken ?: return mapOf("status" to "needs-consent")
    return mapOf("status" to "ok", "accessToken" to token)
  }

  override fun definition() = ModuleDefinition {
    Name("GoogleDriveAuth")

    // Phones without Google Play services (Huawei, de-Googled ROMs) keep the folder backup only.
    Function("isAvailable") {
      GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) == ConnectionResult.SUCCESS
    }

    // Wi-Fi or Ethernet, as Android judges it: connected and not metered.
    Function("isOnUnmeteredNetwork") {
      val manager = context.getSystemService(ConnectivityManager::class.java)
      val caps = manager?.getNetworkCapabilities(manager.activeNetwork)
      caps != null &&
        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
    }

    AsyncFunction("authorize") { interactive: Boolean, promise: Promise ->
      Identity.getAuthorizationClient(context).authorize(request())
        .addOnSuccessListener { result ->
          if (!result.hasResolution()) {
            promise.resolve(ok(result))
            return@addOnSuccessListener
          }
          val activity = appContext.currentActivity
          val intent = result.pendingIntent
          if (!interactive || activity == null || intent == null) {
            promise.resolve(mapOf("status" to "needs-consent"))
            return@addOnSuccessListener
          }
          if (pending != null) {
            promise.reject(AuthException("Authorization already in progress", null))
            return@addOnSuccessListener
          }
          pending = promise
          try {
            activity.startIntentSenderForResult(intent.intentSender, REQUEST_CODE, null, 0, 0, 0, null)
          } catch (e: Exception) {
            pending = null
            promise.reject(AuthException("Couldn't open the Google account chooser", e))
          }
        }
        .addOnFailureListener { e -> promise.reject(AuthException(e.message ?: "Authorization failed", e)) }
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode != REQUEST_CODE) return@OnActivityResult
      val promise = pending ?: return@OnActivityResult
      pending = null
      if (payload.resultCode != Activity.RESULT_OK || payload.data == null) {
        promise.resolve(mapOf("status" to "cancelled"))
        return@OnActivityResult
      }
      try {
        promise.resolve(ok(Identity.getAuthorizationClient(context).getAuthorizationResultFromIntent(payload.data)))
      } catch (e: Exception) {
        promise.resolve(mapOf("status" to "cancelled"))
      }
    }

    // Drops a token Drive rejected (401), so the next authorize() fetches a fresh one.
    AsyncFunction("clearToken") { token: String ->
      try {
        GoogleAuthUtil.clearToken(context, token)
      } catch (e: Exception) {
        // Nothing cached, or Play services unavailable: nothing to clear.
      }
    }
  }
}

package com.universekampus.universeapp2026

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.auth.FirebaseAuth

/**
 * Firebase Cloud Messaging Service
 * Handles FCM token registration and push notifications
 */
class FirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FCMService"
        private const val CHANNEL_ID_DEFAULT = "default"
        private const val CHANNEL_ID_EVENTS = "events"
        private const val CHANNEL_ID_CLUBS = "clubs"
        private const val CHANNEL_NAME_DEFAULT = "Universe Campus"
        private const val CHANNEL_NAME_EVENTS = "Etkinlikler"
        private const val CHANNEL_NAME_CLUBS = "Kulüpler"
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Firebase Messaging Service created")
        createNotificationChannels()
    }

    /**
     * Called when a new FCM token is generated
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM Token: ${token.take(20)}...")
        
        // Save token to Firestore
        saveFCMTokenToFirestore(token)
    }

    /**
     * Save FCM token to user's Firestore profile
     */
    private fun saveFCMTokenToFirestore(fcmToken: String) {
        try {
            val userId = FirebaseAuth.getInstance().currentUser?.uid
            if (userId == null) {
                Log.w(TAG, "No authenticated user found, cannot save FCM token")
                return
            }

            val db = FirebaseFirestore.getInstance()
            val userRef = db.collection("users").document(userId)

            // Update user document with FCM token
            val updateData = hashMapOf<String, Any>(
                "fcmToken" to fcmToken,
                "fcmTokens" to com.google.firebase.firestore.FieldValue.arrayUnion(fcmToken),
                "lastFCMTokenUpdate" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                "deviceInfo" to hashMapOf(
                    "platform" to "android",
                    "version" to Build.VERSION.SDK_INT,
                    "model" to Build.MODEL
                )
            )

            userRef.update(updateData)
                .addOnSuccessListener {
                    Log.d(TAG, "✅ FCM token saved to Firestore successfully")
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "❌ Failed to save FCM token to Firestore", e)
                    
                    // If update fails (user document might not exist), try to set
                    userRef.set(updateData, com.google.firebase.firestore.SetOptions.merge())
                        .addOnSuccessListener {
                            Log.d(TAG, "✅ FCM token merged to Firestore successfully")
                        }
                        .addOnFailureListener { e2 ->
                            Log.e(TAG, "❌ Failed to merge FCM token to Firestore", e2)
                        }
                }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error saving FCM token", e)
        }
    }

    /**
     * Called when a push notification is received
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        Log.d(TAG, "📱 Message received from: ${remoteMessage.from}")

        // Check if message contains a notification payload
        remoteMessage.notification?.let { notification ->
            Log.d(TAG, "📱 Notification Title: ${notification.title}")
            Log.d(TAG, "📱 Notification Body: ${notification.body}")
            
            sendNotification(
                title = notification.title ?: "Universe Campus",
                body = notification.body ?: "",
                data = remoteMessage.data
            )
        }

        // Check if message contains a data payload
        if (remoteMessage.data.isNotEmpty()) {
            Log.d(TAG, "📱 Message data payload: ${remoteMessage.data}")
            
            // If there's no notification payload, create one from data
            if (remoteMessage.notification == null) {
                val title = remoteMessage.data["title"] ?: "Universe Campus"
                val body = remoteMessage.data["body"] ?: remoteMessage.data["message"] ?: ""
                
                sendNotification(
                    title = title,
                    body = body,
                    data = remoteMessage.data
                )
            }
        }
    }

    /**
     * Create notification channels for Android 8.0+
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Default channel
            val defaultChannel = NotificationChannel(
                CHANNEL_ID_DEFAULT,
                CHANNEL_NAME_DEFAULT,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "General notifications from Universe Campus"
                enableLights(true)
                lightColor = android.graphics.Color.parseColor("#6750A4")
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 250, 250)
                setShowBadge(true)
            }

            // Events channel
            val eventsChannel = NotificationChannel(
                CHANNEL_ID_EVENTS,
                CHANNEL_NAME_EVENTS,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Event notifications and reminders"
                enableLights(true)
                lightColor = android.graphics.Color.parseColor("#6750A4")
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 250, 250)
                setShowBadge(true)
            }

            // Clubs channel
            val clubsChannel = NotificationChannel(
                CHANNEL_ID_CLUBS,
                CHANNEL_NAME_CLUBS,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Club notifications and updates"
                enableLights(true)
                lightColor = android.graphics.Color.parseColor("#6750A4")
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 250, 250)
                setShowBadge(true)
            }

            // Register channels
            notificationManager.createNotificationChannel(defaultChannel)
            notificationManager.createNotificationChannel(eventsChannel)
            notificationManager.createNotificationChannel(clubsChannel)

            Log.d(TAG, "✅ Notification channels created successfully")
        }
    }

    /**
     * Send notification to user
     */
    private fun sendNotification(title: String, body: String, data: Map<String, String>) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            // Add notification data to intent
            data.forEach { (key, value) ->
                putExtra(key, value)
            }
        }

        val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_ONE_SHOT
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            pendingIntentFlags
        )

        // Determine channel based on notification type
        val channelId = when (data["type"]) {
            "event" -> CHANNEL_ID_EVENTS
            "club" -> CHANNEL_ID_CLUBS
            else -> CHANNEL_ID_DEFAULT
        }

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setColor(resources.getColor(R.color.notification_color, null))
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Generate unique notification ID based on timestamp
        val notificationId = System.currentTimeMillis().toInt()
        notificationManager.notify(notificationId, notificationBuilder.build())

        Log.d(TAG, "✅ Notification sent: $title")
    }

    override fun onDeletedMessages() {
        super.onDeletedMessages()
        Log.w(TAG, "⚠️ Messages deleted on server")
    }

    override fun onMessageSent(msgId: String) {
        super.onMessageSent(msgId)
        Log.d(TAG, "✅ Message sent: $msgId")
    }

    override fun onSendError(msgId: String, exception: Exception) {
        super.onSendError(msgId, exception)
        Log.e(TAG, "❌ Send error for message: $msgId", exception)
    }
}




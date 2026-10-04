package app.iam.life;

import android.app.Notification;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

/**
 * Reads bank/card notifications. Privacy order of operations:
 *  1. Look only at WHICH APP posted it (package label). Not in the allow-list -> return, content never read.
 *  2. Messaging apps (SMS): the sender title is checked against the sender allow-list; anything else is dropped.
 *  3. Only then are title/text copied into the local queue.
 */
public class IamNotificationListener extends NotificationListenerService {
    private static final String[] MESSAGING_PKGS = {"com.google.android.apps.messaging", "com.samsung.android.messaging", "com.android.mms"};

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            String pkg = sbn.getPackageName();
            if (pkg == null || pkg.equals(getPackageName())) return;
            Notification n = sbn.getNotification();
            if (n == null || (n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;

            String label = labelOf(pkg);
            boolean sms = isMessaging(pkg);
            Bundle e = n.extras;
            if (e == null) return;
            CharSequence title = e.getCharSequence(Notification.EXTRA_TITLE);

            if (sms) {
                if (!NotifStore.senderAllowed(this, title == null ? null : title.toString())) return;
            } else if (!NotifStore.pkgAllowed(this, pkg, label)) {
                return;
            }

            CharSequence big = e.getCharSequence(Notification.EXTRA_BIG_TEXT);
            CharSequence text = big != null ? big : e.getCharSequence(Notification.EXTRA_TEXT);
            NotifStore.enqueue(this, sms ? String.valueOf(title) : label, title == null ? "" : title.toString(), text == null ? "" : text.toString(), sbn.getPostTime());
            NotificationCapturePlugin.ping();
        } catch (Exception ignored) { /* never crash the system listener */ }
    }

    private String labelOf(String pkg) {
        try {
            PackageManager pm = getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
            return String.valueOf(pm.getApplicationLabel(ai));
        } catch (Exception e) { return pkg; }
    }

    static boolean isMessagingPkg(String pkg) { return isMessaging(pkg); }

    private static boolean isMessaging(String pkg) {
        for (String p : MESSAGING_PKGS) if (p.equals(pkg)) return true;
        return false;
    }
}

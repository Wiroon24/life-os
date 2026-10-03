package app.iam.life;

import android.content.ComponentName;
import android.content.Intent;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

@CapacitorPlugin(name = "NotificationCapture")
public class NotificationCapturePlugin extends Plugin {
    private static NotificationCapturePlugin instance;

    @Override
    public void load() { instance = this; }

    /** Called by the listener when something was queued; lets the web layer drain right away if it is alive. */
    static void ping() {
        NotificationCapturePlugin p = instance;
        if (p != null) p.notifyListeners("captured", new JSObject());
    }

    @PluginMethod
    public void status(PluginCall call) {
        String flat = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
        String me = new ComponentName(getContext(), IamNotificationListener.class).flattenToString();
        JSObject o = new JSObject();
        o.put("enabled", flat != null && flat.contains(me));
        try {
            o.put("labels", new JSArray(NotifStore.labels(getContext()).toString()));
            o.put("senders", new JSArray(NotifStore.senders(getContext()).toString()));
        } catch (Exception ignored) { }
        call.resolve(o);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void setAllowed(PluginCall call) {
        try {
            JSArray labels = call.getArray("labels", new JSArray());
            JSArray senders = call.getArray("senders", new JSArray());
            NotifStore.setAllowed(getContext(), new JSONArray(labels.toString()), new JSONArray(senders.toString()));
            call.resolve();
        } catch (Exception e) { call.reject("bad input"); }
    }

    @PluginMethod
    public void drain(PluginCall call) {
        JSObject o = new JSObject();
        try { o.put("items", new JSArray(NotifStore.drain(getContext()).toString())); } catch (Exception e) { o.put("items", new JSArray()); }
        call.resolve(o);
    }
}

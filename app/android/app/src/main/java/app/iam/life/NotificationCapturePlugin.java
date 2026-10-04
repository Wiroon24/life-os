package app.iam.life;

import android.content.ComponentName;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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

    /** Launcher apps installed on the phone (label only), with whether each is currently allowed. Messaging apps are excluded: SMS is filtered by sender instead. */
    @PluginMethod
    public void listApps(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        Intent main = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> infos = pm.queryIntentActivities(main, 0);
        Set<String> seen = new HashSet<>();
        List<JSObject> out = new ArrayList<>();
        for (ResolveInfo ri : infos) {
            String pkg = ri.activityInfo.packageName;
            if (pkg.equals(getContext().getPackageName()) || IamNotificationListener.isMessagingPkg(pkg) || !seen.add(pkg)) continue;
            String label = String.valueOf(ri.loadLabel(pm));
            JSObject o = new JSObject();
            o.put("pkg", pkg); o.put("label", label); o.put("selected", NotifStore.pkgAllowed(getContext(), pkg, label));
            out.add(o);
        }
        Collections.sort(out, (a, b) -> String.valueOf(a.getString("label")).compareToIgnoreCase(String.valueOf(b.getString("label"))));
        JSArray arr = new JSArray();
        for (JSObject o : out) arr.put(o);
        JSObject res = new JSObject();
        res.put("apps", arr);
        call.resolve(res);
    }

    @PluginMethod
    public void setPackages(PluginCall call) {
        try {
            JSArray pk = call.getArray("pkgs", new JSArray());
            NotifStore.setPkgs(getContext(), new JSONArray(pk.toString()));
            call.resolve();
        } catch (Exception e) { call.reject("bad input"); }
    }

    @PluginMethod
    public void setSenders(PluginCall call) {
        try {
            JSArray s = call.getArray("senders", new JSArray());
            NotifStore.setSenders(getContext(), new JSONArray(s.toString()));
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

package app.iam.life;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** On-device storage for the capture allow-list and the queue of captured notifications. Nothing leaves the phone here. */
final class NotifStore {
    private static final String PREFS = "iam_notif";
    private static final int MAX_QUEUE = 200;

    // Defaults: finance apps (matched by app label) and SMS senders (matched by title in messaging apps only).
    private static final String[] DEFAULT_LABELS = {"KTC", "MAKE by KBank", "K PLUS", "KBank", "Bangkok Bank", "TrueMoney"};
    private static final String[] DEFAULT_SENDERS = {"KTC", "KBank", "BBL"};

    private NotifStore() {}

    private static SharedPreferences sp(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static JSONArray labels(Context c) { return read(c, "labels", DEFAULT_LABELS); }
    static JSONArray senders(Context c) { return read(c, "senders", DEFAULT_SENDERS); }

    private static JSONArray read(Context c, String key, String[] defaults) {
        String raw = sp(c).getString(key, null);
        try { if (raw != null) return new JSONArray(raw); } catch (JSONException ignored) { }
        JSONArray a = new JSONArray();
        for (String d : defaults) a.put(d);
        return a;
    }

    static void setAllowed(Context c, JSONArray labels, JSONArray senders) {
        sp(c).edit().putString("labels", labels.toString()).putString("senders", senders.toString()).apply();
    }

    static boolean labelAllowed(Context c, String label) {
        if (label == null) return false;
        String l = label.toLowerCase();
        JSONArray a = labels(c);
        for (int i = 0; i < a.length(); i++) if (l.contains(a.optString(i).toLowerCase()) && !a.optString(i).isEmpty()) return true;
        return false;
    }

    static boolean senderAllowed(Context c, String title) {
        if (title == null) return false;
        JSONArray a = senders(c);
        for (int i = 0; i < a.length(); i++) if (title.trim().equalsIgnoreCase(a.optString(i))) return true;
        return false;
    }

    static synchronized void enqueue(Context c, String label, String title, String text, long ts) {
        try {
            JSONArray q = new JSONArray(sp(c).getString("queue", "[]"));
            JSONObject o = new JSONObject();
            o.put("label", label); o.put("title", title == null ? "" : title); o.put("text", text == null ? "" : text); o.put("ts", ts);
            q.put(o);
            while (q.length() > MAX_QUEUE) q.remove(0);
            sp(c).edit().putString("queue", q.toString()).apply();
        } catch (JSONException ignored) { }
    }

    static synchronized JSONArray drain(Context c) {
        try {
            JSONArray q = new JSONArray(sp(c).getString("queue", "[]"));
            sp(c).edit().putString("queue", "[]").apply();
            return q;
        } catch (JSONException e) { return new JSONArray(); }
    }
}

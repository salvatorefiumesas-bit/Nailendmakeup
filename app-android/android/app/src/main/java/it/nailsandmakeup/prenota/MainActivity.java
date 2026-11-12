package it.nailsandmakeup.prenota;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin scritto per questa app: scarica e installa gli aggiornamenti
        registerPlugin(AggiornaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

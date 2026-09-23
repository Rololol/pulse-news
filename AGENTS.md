# Agentenregeln für Pulse News

Diese Regeln gelten für alle Agenten und automatisierten Änderungen im Repository.

## 1. Fertig heißt vorgeführt

Behaupte nie, dass etwas funktioniert, nur weil der Code plausibel aussieht.

- Führe Änderungen aus, wenn ein ausführbarer Test möglich ist.
- Prüfe die tatsächlich erzeugte Datei bzw. den tatsächlich gerenderten Output.
- Wenn ein Producer und ein Consumer getrennt sind, prüfe beide am selben realen Artefakt.
- Jedes Feld, das das Frontend liest, muss in der tatsächlich erzeugten Daten-Datei nachweisbar vorhanden sein.
- Bei öffentlichen Inhalten gilt: Erst verifizieren, dann als fertig melden.

## 2. Keine zweite Implementierung stehen lassen

Wenn eine bestehende Implementierung ersetzt wird:

- den alten Weg im selben Arbeitsschritt entfernen;
- keine verwaisten Dateien, Styles, Funktionen, Datenfelder oder Zwischenprodukte zurücklassen;
- keine parallelen Implementierungen behalten, wenn nur eine davon tatsächlich verwendet wird.

Am Ende jeder Aufgabe ausdrücklich nennen, was entfernt wurde. Wenn nichts entfernt wurde, kurz begründen.

## 3. Nichts anbieten, was die Daten nicht hergeben

Die Benutzeroberfläche muss sich an den tatsächlich vorhandenen Daten orientieren.

- Filter, Tabs, Dropdowns und ähnliche Auswahlmöglichkeiten aus den vorhandenen Daten erzeugen.
- Keine hartkodierte Wunschliste anzeigen, wenn daraus leere Ansichten entstehen können.
- Auswahlmöglichkeiten ausblenden, wenn sie keine Ergebnisse liefern würden.
- Keine Buttons oder Links anbieten, deren Ziel bzw. Inhalt aus den vorhandenen Daten nicht existiert.

## 4. Alles was wiederholt läuft, braucht eine Grenze

Vor jedem Cronjob, Cache oder jeder regelmäßig erzeugten Datei prüfen:

- Wie groß kann das Ergebnis in 30 Tagen werden?
- Wer löscht oder begrenzt alte Daten?
- Gibt es eine TTL, Größenbegrenzung oder Aufbewahrungsfrist?
- Werden IDs und Cache-Schlüssel aus dem Inhalt abgeleitet?

IDs dürfen nicht ausschließlich aus Position oder Reihenfolge entstehen. Ein neuer Lauf darf nicht dazu führen, dass dieselbe ID auf eine andere Meldung zeigt.

## 5. Recht und Betrieb ungefragt melden

Bei öffentlich erreichbaren Funktionen aktiv auf relevante Betriebs- und Datenschutzpunkte hinweisen.

Insbesondere prüfen:

- Datenschutzerklärung;
- Impressum;
- externe Ressourcen wie CDN-Fonts;
- Analytics, Tracking, Werbenetzwerke und andere Dienste, an die Nutzerdaten fließen können;
- öffentliche API-Schlüssel oder andere Geheimnisse;
- Kostenrisiken durch externe APIs.

Rechtliche oder externe Dienste nicht stillschweigend hinzufügen. Auf notwendige Punkte hinweisen und vor zusätzlichen, nicht ausdrücklich gewünschten Diensten Rücksprache halten.

Automatisch erzeugter Text geht niemals ungeprüft als verlässlich gekennzeichneter Inhalt live. KI-Ausgaben müssen durch Regeln, Plausibilitätsprüfungen oder einen nachvollziehbaren Fallback abgesichert werden.

## Arbeitsabschluss

Vor dem Abschluss einer Aufgabe:

1. Änderungen tatsächlich ausführen.
2. Producer und Consumer am selben Artefakt prüfen.
3. Alte Implementierungen und ungenutzte Dateien entfernen.
4. Wiederholte Prozesse auf Wachstum und Bereinigung prüfen.
5. Öffentliche Betriebs- und Datenschutzaspekte prüfen.
6. Kurz dokumentieren, was geändert und was entfernt wurde.

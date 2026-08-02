# Praxis LIORA — Website

Website der Praxis LIORA in Breitenbach (Fussreflexzonentherapie).
Reines HTML, CSS und JavaScript — kein Build-Werkzeug, kein Framework.
Schriften und Bilder liegen lokal im Projekt; beim Aufruf der Seite gehen
keinerlei Anfragen an Dritte.

## Lokal ansehen

```bash
python3 -m http.server 4321
```

Dann <http://localhost:4321> öffnen.

## Aufbau

```
index.html          Startseite
ueber-mich.html     Werdegang und Ausbildungen
angebote.html       Alle sechs Behandlungen mit Dauer und Preis
kontakt.html        Kontaktdaten, Anfrageformular, Anfahrt
404.html            Fehlerseite

assets/css/styles.css   Design-System: Farben, Typografie, Bausteine
assets/css/fonts.css    Schrifteinbindung
assets/js/main.js       Menü, Formular, Vorauswahl der Behandlung
assets/fonts/           Cormorant Garamond + Karla (SIL Open Font License 1.1)
assets/img/             Bilder, je in 480/960/1440 px als WebP mit JPEG-Reserve

robots.txt · sitemap.xml · .nojekyll
```

## Inhalte ändern

- **Preise und Behandlungen:** in `angebote.html` (alle sechs) und auf der
  Startseite in `index.html` (die ersten drei). Die Preise stehen zusätzlich im
  strukturierten Datensatz oben in `index.html` — dort mitpflegen.
- **Farben, Schriftgrössen, Abstände:** ganz oben in `assets/css/styles.css`
  unter `:root`. Die OKLCH-Autorenwerte stehen als Kommentar daneben.
- **Texte:** direkt in der jeweiligen HTML-Datei.

### Bilder neu erzeugen

Quellbilder liegen ausserhalb des Repos. Nach dem Austausch:

```bash
python3 -c "
from pathlib import Path
from PIL import Image, ImageOps
SRC=Path('Design-Vorlage mit Farbsystem/assets/img'); OUT=Path('assets/img')
for src in SRC.glob('*.jpg'):
    im=ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    for w in (480,960,1440):
        if w>im.width: continue
        h=round(im.height*w/im.width)
        r=im.resize((w,h), Image.LANCZOS)
        r.save(OUT/f'{src.stem}-{w}.webp','WEBP',quality=80,method=6)
        if w==960: r.save(OUT/f'{src.stem}-960.jpg','JPEG',quality=82,optimize=True,progressive=True)
"
```

`convert('RGB')` verwirft dabei auch die EXIF-Daten der Originale — Kameramodell,
Aufnahmezeit und mögliche GPS-Koordinaten landen so nicht im Web.

## Konfiguration

Zwei Stellen sind umgebungsabhängig und beim Wechsel auf die produktive Domain
anzupassen:

**Formularversand.** Die Adresse des Formulardienstes steht an zwei Stellen:
als Konstante `FORM_ENDPOINT` in `assets/js/main.js` (Versand im Hintergrund)
und als `action` in `kontakt.html` (Rückfall für Besucher ohne JavaScript).
Beide müssen übereinstimmen.

Bewusst ohne die Bibliothek `@formspree/ajax`: die wird per CDN nachgeladen und
brächte damit die einzige Anfrage an einen Dritten in die Seite. Die AJAX-Logik
ist von Hand implementiert und deckt mehr ab — deutschsprachige Fehlertexte,
Lade- und Erfolgszustand, Schutz vor Doppelversand, Spam-Falle (`_gotcha`).

Steht in `FORM_ENDPOINT` ein Platzhalter, schaltet das Formular selbsttätig auf
das Mailprogramm der Besucherin um, mit fertig ausgefüllter Nachricht. Ein
Wechsel des Dienstes betrifft nur die Funktion `sendViaEndpoint()`.

**Sichtbarkeit für Suchmaschinen.** Die Seiten tragen eine `noindex`-Angabe,
solange die Seite als Vorschau unter einer Zwischenadresse läuft. Auf der
produktiven Domain entfernen:

```bash
sed -i '' '/GO-LIVE: diese Zeile entfernen/d' index.html ueber-mich.html angebote.html kontakt.html
```

**Eigene Domain.** Datei `CNAME` mit der Domain als Inhalt in der Projektwurzel
anlegen und die DNS-Einträge beim Anbieter auf GitHub zeigen lassen. Alle Pfade
sind relativ, sonst ändert sich nichts.

## Veröffentlichen

Die Seite läuft über GitHub Pages vom Branch `main`, Verzeichnis `/`.
Ein `git push` genügt; der Build startet automatisch.

## Was bewusst so gebaut ist

- **Ohne JavaScript nutzbar.** Navigation, Inhalte und Formularversand
  funktionieren auch bei abgeschaltetem JavaScript.
- **Keine fremden Server.** Schriften liegen lokal, es gibt keine eingebettete
  Karte und keine Zählpixel. Die Anfahrt ist verlinkt statt eingebettet — ein
  eingebetteter Kartendienst erhielte sonst ungefragt die IP-Adresse jeder
  Besucherin.
- **Barrierefreiheit.** Alle Farbkombinationen erfüllen WCAG AA, Bedienelemente
  sind mindestens 46 px hoch, die Seite ist vollständig mit der Tastatur bedienbar.
- **Sichtbarkeit hängt nie an einer Animation.** Läuft eine Animation nicht,
  bleibt der Inhalt trotzdem sichtbar.
- **Bilder responsiv.** Je drei Grössen als WebP mit JPEG-Reserve; die Startseite
  lädt rund 400 KB.

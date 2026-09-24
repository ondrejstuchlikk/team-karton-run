# 🏃📦 Team Karton Run

Endless runner ve stylu Subway Surfers pro náš běžecký tým **Team Karton**
(Kratom → Karton 😉). Hra běží čistě v prohlížeči, hlavně na mobilu, a je hostovaná zdarma na GitHub Pages.

- 3 dráhy, uhýbání, skoky a skluzy
- 4 běžci: **Rob, Pepan, Kuba, Ondra**, každý s vlastním účesem, barvou dresu a jménem na zádech
- Překážky: velké láhve a barely s kratomem, cigarety napříč dráhou a vzácně joint ve výšce hlavy
- Sbírej kartonové krabice pro bonusové body (1 krabice = 10 bodů)
- Sbírej kelímky s kratomem (1 kelímek = 25 bodů): běžec se na 3 s zrychlí a táhne za sebou ohnivou stopu
- Rekordy (celkový a pro každou postavu) se ukládají v prohlížeči
- Dá se přidat na plochu telefonu jako aplikace

## Ovládání

| Akce | Mobil | Počítač |
|---|---|---|
| Změna dráhy | swipe ← / → | šipky ← → nebo A / D |
| Skok | swipe ↑ | šipka ↑, W nebo mezerník |
| Skluz | swipe ↓ | šipka ↓ nebo S |
| Pauza | tlačítko ⏸ | P nebo Esc |

Swipe ve vzduchu dolů = rychlý dopad a hned skluz. Když narazíš do překážky z boku, odrazíš se zpět do své dráhy.
Náraz zepředu znamená konec hry.

## Struktura projektu

```
index.html          – stránka, obrazovky UI, importmap pro Three.js z CDN
style.css           – vzhled UI (mobil, safe-area, velká tlačítka)
manifest.json       – PWA manifest (přidání na plochu)
icons/              – ikony aplikace
js/main.js          – vstupní bod, propojení všech modulů
js/game.js          – renderer, kamera, herní smyčka (delta time), kolize, skóre
js/world.js         – trať, chodníky, stromy, lampy, cedule TEAM KARTON
js/player.js        – pohyb hráče, skok, skluz, animace běhu
js/characters.js    – definice postav, 3D modely (účesy, obličej), 2D avatary
js/obstacles.js     – překážky, krabice, kelímky kratomu, object pooling, generátor průchozích řad
js/effects.js       – ohnivá stopa s kouřem při zrychlení
js/input.js         – swipe (reaguje už během tahu) + klávesnice
js/audio.js         – zvukové efekty přes Web Audio API
js/storage.js       – rekordy a nastavení v localStorage
js/config.js        – herní konstanty (rychlost, dráhy…)
js/geo.js           – pomocné funkce pro low-poly geometrii
```

Žádný build krok. Stačí statické soubory. Three.js (verze 0.160.0) se načítá z jsDelivr CDN.

### Úprava postav

Postavy jsou definované v [js/characters.js](js/characters.js) v poli `CHARACTERS`:
jméno, barva dresu (`color`), účes (`hair`: `bald`, `short`, `shortCrown`, `medium`), barva vlasů a podtitulek.
Stačí tam změnit hodnoty a obnovit stránku.

## Lokální testování

ES moduly nefungují při otevření `index.html` přímo ze souboru (`file://`). Je potřeba jednoduchý lokální server:

```bash
cd cesta/ke/složce/HRA
python3 -m http.server 8000
```

Pak otevři v prohlížeči **http://localhost:8000**.

(Alternativa: rozšíření *Live Server* ve VS Code, pravý klik na `index.html` → „Open with Live Server“.)

### Test na telefonu ve stejné Wi-Fi

1. Spusť server tak, aby poslouchal na všech rozhraních:
   ```bash
   python3 -m http.server 8000 --bind 0.0.0.0
   ```
2. Zjisti IP adresu počítače: na macOS `ipconfig getifaddr en0` (např. `192.168.0.94`).
3. Na telefonu (stejná Wi-Fi) otevři `http://192.168.0.94:8000`.
4. Když se stránka nenačte, povol v macOS firewallu příchozí spojení pro Python
   (Nastavení systému → Síť → Firewall).

Poznámka: celá obrazovka a instalace na plochu fungují naplno až přes HTTPS, tedy na GitHub Pages.

## Nasazení na GitHub Pages (krok za krokem)

GitHub Pages je na bezplatném účtu zdarma pro **veřejné** repozitáře.

### Varianta A: přes terminál (`gh` CLI)

```bash
cd cesta/ke/složce/HRA
git init -b main                      # pokud ještě není git repozitář
git add .
git commit -m "Team Karton Run"
gh repo create team-karton-run --public --source=. --push
gh api -X POST repos/{owner}/team-karton-run/pages -f "source[branch]=main" -f "source[path]=/"
```

(`{owner}` nech přesně takhle, `gh` si ho doplní sám.)

### Varianta B: přes web GitHubu

1. Na https://github.com/new vytvoř nový repozitář, např. `team-karton-run`, a nastav ho jako **Public**.
   Nezaškrtávej README ani .gitignore.
2. V terminálu ve složce hry:
   ```bash
   git init -b main
   git add .
   git commit -m "Team Karton Run"
   git remote add origin https://github.com/TVUJ-UCET/team-karton-run.git
   git push -u origin main
   ```
3. Na GitHubu otevři repozitář → **Settings** → **Pages**.
4. V části *Build and deployment* nastav **Source: Deploy from a branch**,
   **Branch: `main`**, složka **`/ (root)`** → **Save**.
5. Po 1–2 minutách bude hra na adrese
   **`https://TVUJ-UCET.github.io/team-karton-run/`**. Stav nasazení uvidíš v záložce *Actions*.

### Aktualizace hry

Po každé změně:

```bash
git add .
git commit -m "Popis změny"
git push
```

GitHub Pages se aktualizuje sám během minuty nebo dvou. Na telefonu případně obnov stránku.

## Přidání na plochu telefonu

- **iPhone (Safari):** tlačítko Sdílet → *Přidat na plochu*
- **Android (Chrome):** menu ⋮ → *Přidat na plochu* / *Instalovat aplikaci*

## Technické poznámky k výkonu

- `devicePixelRatio` omezený na max 2. Když FPS klesnou pod ~45, rozlišení se automaticky sníží.
- Low-poly modely: kulisy a překážky jsou sloučené do jedné geometrie s barvami ve vrcholech (málo draw callů).
- Object pooling pro překážky, krabice i kulisy. Během hry se nic nevytváří ani nemaže.
- Žádné dynamické stíny, jen falešný stín pod běžcem.
- Herní logika používá delta time, takže rychlost hry nezávisí na FPS.

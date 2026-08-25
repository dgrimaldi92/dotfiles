Trasforma {{ fonte }} in carte Anki.

Deck: Patofisio::{{ argomento }}
Tag: patofisio {{ tag }}

Regole:

- Italiano, terminologia della fonte. Non tradurre, non riformulare i
  termini del professore.
- Un fatto per carta. Se la risposta contiene "e", sono due carte.
- Cloze per i meccanismi e le catene causali, basic per i "perché" che
  richiedono una frase di spiegazione.
- Mai cloze su un'intera proposizione: `{{c1::ridotte}}` è una carta,
  `{{c1::le SVR sono ridotte e la portata aumentata}}` è un riempi-gli-spazi
  che non verifica nulla.
- Nel campo `extra` metti il riferimento alla fonte (lezione, slide,
  capitolo) così posso risalirci.
- Niente carte rispondibili dalla sola forma della frase.

Costruisci il JSON, poi `ankicli batch - -d "Patofisio::{{ argomento }}"
--tags "patofisio {{ tag }}" --dry-run` e mostrami la lista. Non inviare
niente finché non confermo.

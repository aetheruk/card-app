# Pokemon TCG Collection

Pokemon TCG Collection is a fan-made card collection and memory game built with React, Vite, and TypeScript. It lets players browse Pokemon Trading Card Game sets, view card details, manage a local collection, and play a card reveal game using Pokemon TCG card data.

The app is designed to work offline after the first load. It bundles a snapshot of card and set metadata in `public/tcg`, stores collection data locally in the browser, and can refresh TCG data from the source dataset when requested.

## Features

- Browse Pokemon TCG sets and cards.
- View card artwork, rarity, set, artist, type, and other metadata.
- Track a personal collection locally in the browser.
- Play a card reveal memory game with difficulty and reward logic.
- Offline-friendly PWA support with local caching.

## Data Source

Card and set data is sourced from the community-maintained Pokemon TCG data project:

- https://github.com/PokemonTCG/pokemon-tcg-data
- https://pokemontcg.io/

Thanks to the Pokemon TCG API/data maintainers and contributors for making structured Pokemon TCG card data available to the community.

## Fan Project Notice

This is an unofficial fan project. It is not affiliated with, endorsed by, sponsored by, or approved by The Pokemon Company, Nintendo, Game Freak, Creatures Inc., or any related rights holders.

Pokemon, Pokemon TCG, card names, card artwork, logos, and related marks are trademarks or copyrighted works of their respective owners. This project is intended for personal, educational, and fan use.

## License

The original app code in this repository is open source under the MIT License. See `LICENSE` for details.

Pokemon TCG data, card artwork, names, logos, and related materials are not covered by this project's code license and remain the property of their respective rights holders.

## Development

Install dependencies:

```bash
bun install
```

Start the development server:

```bash
bun run dev
```

Build for production:

```bash
bun run build
```

Refresh the bundled TCG data:

```bash
bun run refresh:tcg
```

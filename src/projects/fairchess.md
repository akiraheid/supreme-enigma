---
layout: project.pug
title: Fair Chess
---

Fair Chess is a game that uses the [Thue-Morse Sequence](https://en.wikipedia.org/wiki/Thue%E2%80%93Morse_sequence) to dictate player turn order. A playable web version of this game and the rules are [here](https://fairchess.savagesnipe.com).


# Why?

Fair Chess was a project [Brian](https://github.com/bbeallo12) and I started back in 2016 after watching [a video](https://www.youtube.com/watch?v=prh72BLNjIk) by Matt Parker on the Stand-up Maths channel on YouTube about the Thue-Morse Sequence. We couldn't find a version online, so we made one that others could enjoy too!


# Features

* Docker container used to render the application files to serve
* Minimax with α–β pruning on a non-alternating turn order for AI opponent


# Updates


## 2020-06-27

Public release (again)!

Multiplayer functionality was removed in favor of playing against an AI for now to simplify things and not have to worry about maintaining a feature I knew needed more attention than I could give it at the moment. Plus, no one was using it, so no one will know it's gone.

After spending longer than I should have trying to implement minimax with α–β pruning from scratch with modifications for the new turn order, I resorted to modifying a version of minimax with α–β pruning implemented for classic chess [here](https://www.freecodecamp.org/news/simple-chess-ai-step-by-step-1d55a9266977/). The piece-square tables feature from that page aren't implemented yet.

While the AI is thinking, it won't tell you it's thinking so that some players will forfeit by closing the page. Behind the AI's strategy, minimax is just taking its sweet-butt time (~30+ seconds) to make a move for search depths ≥ 4.

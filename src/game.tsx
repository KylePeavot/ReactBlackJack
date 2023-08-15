import { useState } from "react";
import {
  Card,
  CardRank,
  CardDeck,
  CardSuit,
  GameState,
  Hand,
  GameResult,
} from "./types";

//UI Elements
const CardBackImage = () => (
  <img src={process.env.PUBLIC_URL + `/SVG-cards/png/1x/back.png`} />
);

const CardImage = ({ suit, rank }: Card) => {
  const card = rank === CardRank.Ace ? 1 : rank;
  return (
    <img
      src={
        process.env.PUBLIC_URL +
        `/SVG-cards/png/1x/${suit.slice(0, -1)}_${card}.png`
      }
    />
  );
};

//Setup
const newCardDeck = (): CardDeck =>
  Object.values(CardSuit)
    .map((suit) =>
      Object.values(CardRank).map((rank) => ({
        suit,
        rank,
      }))
    )
    .reduce((a, v) => [...a, ...v]);

const shuffle = (deck: CardDeck): CardDeck => {
  return deck.sort(() => Math.random() - 0.5);
};

const takeCard = (deck: CardDeck): { card: Card; remaining: CardDeck } => {
  const card = deck[deck.length - 1];
  const remaining = deck.slice(0, deck.length - 1);
  return { card, remaining };
};

const setupGame = (): GameState => {
  const cardDeck = shuffle(newCardDeck());
  return {
    playerHand: cardDeck.slice(cardDeck.length - 2, cardDeck.length),
    dealerHand: cardDeck.slice(cardDeck.length - 4, cardDeck.length - 2),
    cardDeck: cardDeck.slice(0, cardDeck.length - 4), // remaining cards after player and dealer have been give theirs
    turn: "player_turn",
  };
};

//Scoring
//------ Start of Kyle's code ------
const calculateHandScore = (hand: Hand): number => {
  const numbers = hand.filter(isNumber);
  const faces = hand.filter(isFace)
  const aces = hand.filter(isAce)

  const totalValueOfNumbers = numbers.reduce((total, currentCard) => {
    return total + Number(currentCard.rank);
  }, 0);
  const totalValueOfFaces = faces.length * 10;

  let runningHandScore = totalValueOfNumbers + totalValueOfFaces;

  aces.forEach((_, index) => {
    const minimumFutureAcesPlay = (aces.length - (index + 1));

    //INFO: Playing an eleven with your ace is safe if it _won't_ force future aces to go bust if they hold the minimum value
    //e.g. The runningHandScore is 8 and there are two Aces left.
    //     Playing 11 with the current Ace is safe because 8 + 11 + 1 = 20
    //     This is safe because 20 will not force the player to go bust 
    const isElevenSafe = runningHandScore + 11 + minimumFutureAcesPlay <= 21

    if (isElevenSafe) {
      runningHandScore += 11;
    } else {
      runningHandScore += 1
    }
  });

  return runningHandScore;
};

const isFace = (card: Card): boolean => {
  return card.rank === 'jack' || card.rank === 'queen' || card.rank === 'king';
}

const isAce = (card: Card): boolean => {
    return card.rank === 'ace';
}

const isNumber = (card: Card): boolean => {
  return !isAce(card) && !isFace(card);
}

const isHandBlackJack = (hand: Hand): boolean => {
  if (hand.length !== 2) {
    return false;
  }

  const [firstCard, secondCard] = hand;

  const isFirstCardAce = isAce(firstCard);
  const isFirstCardFace = isFace(firstCard);
  const isSecondCardAce = isAce(secondCard);
  const isSecondCardFace = isFace(secondCard);

  if ((isFirstCardAce && isSecondCardFace) || (isFirstCardFace && isSecondCardAce)) {
      return true;
  }

  return false;
}

const determineGameResult = ({ playerHand, dealerHand }: GameState): GameResult => {
  const playersHandScore = calculateHandScore(playerHand)
  const dealersHandScore = calculateHandScore(dealerHand)

  const isPlayerHandBlackJack = isHandBlackJack(playerHand);
  const isDealerHandBlackJack = isHandBlackJack(dealerHand);

  if (isPlayerHandBlackJack && isDealerHandBlackJack) {
    return 'draw'
  } else if (isPlayerHandBlackJack) {
    return 'player_win'
  } else if (isDealerHandBlackJack) {
    return 'dealer_win';
  }
  
  if (playersHandScore === dealersHandScore) {
    return 'draw';
  }

  if (playersHandScore > 21) {
    return 'dealer_win';
  }
  
  if (dealersHandScore > 21) {
    return 'player_win';
  }  

  if (dealersHandScore > playersHandScore) {
    return 'dealer_win'
  }

  if (playersHandScore > dealersHandScore) {
    return 'player_win'
  }

  return 'no_result';
};

//Player Actions
const playerStands = (state: GameState): GameState => {
  const dealerHandScore = calculateHandScore(state.dealerHand);

  if (dealerHandScore > 16) {
    return {
      ...state,
      turn: "dealer_turn",
    };
  }

  const { card, remaining } = takeCard(state.cardDeck);

  return {
    ...state,
    cardDeck: remaining,
    dealerHand: [...state.dealerHand, card],
    turn: "dealer_turn",
  }
};

//------ End of Kyle's code ------

const playerHits = (state: GameState): GameState => {
  const { card, remaining } = takeCard(state.cardDeck);
  return {
    ...state,
    cardDeck: remaining,
    playerHand: [...state.playerHand, card],
  };
};

//UI Component
const Game = (): JSX.Element => {
  const [state, setState] = useState(setupGame());

  return (
    <>
      <div>
        <p>There are {state.cardDeck.length} cards left in deck</p>
        <button
          disabled={state.turn === "dealer_turn"}
          onClick={(): void => setState(playerHits)}
        >
          Hit
        </button>
        <button
          disabled={state.turn === "dealer_turn"}
          onClick={(): void => setState(playerStands)}
        >
          Stand
        </button>
        <button onClick={(): void => setState(setupGame())}>Reset</button>
      </div>
      <p>Player Cards</p>
      <div>
        {state.playerHand.map(CardImage)}
        <p>Player Score {calculateHandScore(state.playerHand)}</p>
      </div>
      <p>Dealer Cards</p>
      {state.turn === "player_turn" && state.dealerHand.length > 0 ? (
        <div>
          <CardBackImage />
          <CardImage {...state.dealerHand[1]} />
        </div>
      ) : (
        <div>
          {state.dealerHand.map(CardImage)}
          <p>Dealer Score {calculateHandScore(state.dealerHand)}</p>
        </div>
      )}
      {state.turn === "dealer_turn" &&
      determineGameResult(state) != "no_result" ? (
        <p>{determineGameResult(state)}</p>
      ) : (
        <p>{state.turn}</p>
      )}
    </>
  );
};

export {
  Game,
  playerHits,
  playerStands,
  determineGameResult,
  calculateHandScore,
  setupGame,
};

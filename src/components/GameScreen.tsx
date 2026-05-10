import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CardDrawReveal } from './CardDrawReveal'
import { DIFFICULTIES } from '../game/difficulties'
import { buildQuestion, sample, type InspectionQuestion } from '../game/questions'
import { drawRewardCards } from '../game/rewards'
import type { Difficulty, GameResult, TcgCard, TcgSet } from '../types/tcg'

type Phase = 'study' | 'question' | 'done'
type AnswerStatus = 'correct' | 'incorrect' | null

interface GameScreenProps {
  set: TcgSet
  cards: TcgCard[]
  difficulty: Difficulty
  onFinish: (result: GameResult) => Promise<void>
  onExit: () => void
}

export function GameScreen({
  set,
  cards,
  difficulty,
  onFinish,
  onExit,
}: GameScreenProps) {
  const config = DIFFICULTIES[difficulty]
  const playableCards = useMemo(
    () => cards.filter((card) => card.images.small || card.images.large),
    [cards],
  )
  const sessionCards = useMemo(
    () =>
      sample(playableCards, Math.min(config.packSize, playableCards.length)).map(
        (card) => ({ ...card, setName: set.name }),
      ),
    [config.packSize, playableCards, set.name],
  )
  const questions = useMemo<InspectionQuestion[]>(
    () =>
      Array.from({ length: config.rounds }, () =>
        buildQuestion(
          sessionCards,
          playableCards.map((card) => ({ ...card, setName: set.name })),
          config.questionTypes,
        ),
      ),
    [config.questionTypes, config.rounds, playableCards, sessionCards, set.name],
  )

  const [phase, setPhase] = useState<Phase>('study')
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewDirection, setPreviewDirection] = useState(1)
  const [studyLeft, setStudyLeft] = useState(30)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(2)
  const [timeLeft, setTimeLeft] = useState(config.timeLimit)
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>(null)
  const [result, setResult] = useState<GameResult | null>(null)
  const [rewardCards, setRewardCards] = useState<TcgCard[]>([])
  const [showRewards, setShowRewards] = useState(false)
  const scoreRef = useRef(0)
  const finishingRef = useRef(false)

  const finish = useCallback(async (finalScore: number) => {
    if (finishingRef.current) return
    finishingRef.current = true
    const won = finalScore >= config.winScore
    const rewards = won ? drawRewardCards(playableCards, config.rewardCards) : []
    const nextResult: GameResult = {
      setId: set.id,
      difficulty,
      score: finalScore,
      won,
      awardedCardIds: rewards.map((card) => card.id),
      playedAt: new Date().toISOString(),
    }
    setResult(nextResult)
    setRewardCards(rewards)
    setPhase('done')
    await onFinish(nextResult)
    if (rewards.length > 0) {
      setShowRewards(true)
    } else {
      onExit()
    }
  }, [
    config.rewardCards,
    config.winScore,
    difficulty,
    onFinish,
    playableCards,
    set.id,
  ])

  const startQuiz = useCallback(() => {
    setTimeLeft(config.timeLimit)
    setPhase('question')
  }, [config.timeLimit])

  useEffect(() => {
    if (phase !== 'study') return
    if (studyLeft <= 0) {
      startQuiz()
      return
    }
    const timer = window.setTimeout(
      () => setStudyLeft((value) => value - 1),
      1000,
    )
    return () => window.clearTimeout(timer)
  }, [phase, startQuiz, studyLeft])

  useEffect(() => {
    if (phase !== 'question') return
    if (timeLeft <= 0) {
      void finish(scoreRef.current)
      return
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [finish, phase, timeLeft])

  function choose(option: string) {
    if (answerStatus || phase !== 'question') return
    const question = questions[questionIndex]
    const correct = option === question.answer
    const nextScore = correct
      ? scoreRef.current + config.pointsPerCorrect
      : scoreRef.current
    const nextLives = correct ? lives : Math.max(0, lives - 1)
    setAnswerStatus(correct ? 'correct' : 'incorrect')
    setScore(nextScore)
    setLives(nextLives)
    scoreRef.current = nextScore

    window.setTimeout(() => {
      if (nextScore >= config.winScore || nextLives <= 0) {
        void finish(nextScore)
      } else if (questionIndex >= questions.length - 1) {
        void finish(nextScore)
      } else {
        setQuestionIndex((value) => value + 1)
        setAnswerStatus(null)
      }
    }, 1350)
  }

  function showPreviousCard() {
    setPreviewDirection(-1)
    setPreviewIndex((value) =>
      value === 0 ? sessionCards.length - 1 : value - 1,
    )
  }

  function showNextCard() {
    setPreviewDirection(1)
    setPreviewIndex((value) =>
      value >= sessionCards.length - 1 ? 0 : value + 1,
    )
  }

  if (playableCards.length < 4) {
    return (
      <main className="game-screen">
        <button className="ghost-button" onClick={onExit}>
          <ArrowLeft size={16} /> Back
        </button>
        <section className="empty-state">
          This set does not have enough cards with images for a game.
        </section>
      </main>
    )
  }

  const currentQuestion = questions[questionIndex]
  const targetCard = currentQuestion
    ? sessionCards[currentQuestion.targetIndex]
    : null

  return (
    <main className="game-screen">
      {phase !== 'done' && (
        <div className="inspection-shell">
          <section className="inspection-visual-stage">
            <div className="inspection-bg" />
            <div className="inspection-bg-shade" />
            <div
              className={`progress-chip ${
                score >= config.winScore ? 'complete' : ''
              }`}
            >
              <CheckCircle2 size={12} />
              <span>{score} / {config.winScore}</span>
            </div>
            <div className="lives-chip" aria-label={`${lives} lives remaining`}>
              {Array.from({ length: 2 }).map((_, index) => (
                <Heart
                  key={index}
                  size={13}
                  className={index < lives ? 'life-on' : 'life-off'}
                  fill="currentColor"
                />
              ))}
            </div>
            <div className="timer-chip">
              <CircularTimer
                timeLeft={phase === 'study' ? studyLeft : timeLeft}
                totalTime={phase === 'study' ? 30 : config.timeLimit}
              />
            </div>
            <button className="exit-chip" onClick={onExit} aria-label="Exit game">
              <ArrowLeft size={14} />
            </button>

            {phase === 'question' && targetCard && (
              <div className="question-card-animation">
                <AnimatePresence mode="wait">
                  {!answerStatus && (
                    <motion.div
                      key={`back-${questionIndex}`}
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="inspection-question-card"
                    >
                      <img src="/tcg-back.png" alt="Card back" />
                    </motion.div>
                  )}

                  {answerStatus === 'correct' && (
                    <motion.div
                      key={`correct-${questionIndex}`}
                      initial={{ opacity: 1, rotateY: 90, y: 0, scale: 0.98 }}
                      animate={{
                        opacity: [1, 1, 0],
                        rotateY: [90, 0, 0],
                        y: [0, 0, -190],
                        scale: [0.98, 1.05, 0.9],
                      }}
                      transition={{
                        duration: 1.2,
                        times: [0, 0.45, 1],
                        ease: 'easeOut',
                      }}
                      className="inspection-question-card"
                    >
                      <img src={targetCard.images.small} alt={targetCard.name} />
                    </motion.div>
                  )}

                  {answerStatus === 'incorrect' && (
                    <motion.div
                      key={`incorrect-${questionIndex}`}
                      initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                      animate={{
                        opacity: [1, 1, 0],
                        x: [0, -12, 12, -10, 10, 0],
                        y: [0, 0, 0, 0, 25, 240],
                        rotate: [0, -4, 4, -4, 4, 8],
                      }}
                      transition={{ duration: 1.2, ease: 'easeIn' }}
                      className="inspection-question-card"
                    >
                      <img src="/tcg-back.png" alt="Card back" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </section>

          <section className="inspection-play-stage">
            {phase === 'question' && <div className="question-radial" />}
            {phase === 'question' && currentQuestion && (
              <QuestionPrompt
                question={currentQuestion.prompt}
                options={currentQuestion.options}
                answerStatus={answerStatus}
                onAnswer={choose}
              />
            )}

            {phase !== 'question' && (
              <div className="preview-content study-content">
                <div
                  className="difficulty-orb study-card-number"
                  aria-label={`Card ${previewIndex + 1} of ${sessionCards.length}`}
                >
                  {previewIndex + 1}
                </div>
                <div className="study-carousel">
                  <button
                    className="study-nav-button"
                    onClick={showPreviousCard}
                    aria-label="Previous card"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <AnimatePresence
                    initial={false}
                    custom={previewDirection}
                    mode="wait"
                  >
                    {sessionCards[previewIndex] && (
                      <motion.img
                        key={sessionCards[previewIndex].id}
                        className="inspection-preview-card"
                        src={
                          sessionCards[previewIndex].images.large ||
                          sessionCards[previewIndex].images.small
                        }
                        alt={sessionCards[previewIndex].name}
                        custom={previewDirection}
                        initial={{
                          opacity: 0,
                          x: previewDirection * 80,
                          scale: 0.96,
                        }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{
                          opacity: 0,
                          x: previewDirection * -80,
                          scale: 0.96,
                        }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        onError={(event) => {
                          event.currentTarget.src =
                            sessionCards[previewIndex].images.small ||
                            '/icon.svg'
                        }}
                      />
                    )}
                  </AnimatePresence>
                  <button
                    className="study-nav-button"
                    onClick={showNextCard}
                    aria-label="Next card"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
                <button
                  className="reveal-action primary study-ready-button"
                  onClick={startQuiz}
                >
                  Ready
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {showRewards && (
        <CardDrawReveal
          cards={rewardCards}
          onComplete={() => {
            setShowRewards(false)
            onExit()
          }}
        />
      )}
    </main>
  )
}

function CircularTimer({
  timeLeft,
  totalTime,
}: {
  timeLeft: number
  totalTime: number
}) {
  const size = 48
  const center = 24
  const radius = 20
  const width = 4
  const circumference = 2 * Math.PI * radius
  const offset =
    circumference * (1 - Math.max(0, timeLeft) / Math.max(1, totalTime))
  const lowTime = timeLeft <= 5

  return (
    <div className="circular-timer">
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={width}
          className="timer-track"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={width}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={lowTime ? 'timer-progress low' : 'timer-progress'}
        />
      </svg>
      <span>{timeLeft}</span>
    </div>
  )
}

function QuestionPrompt({
  question,
  options,
  answerStatus,
  onAnswer,
}: {
  question: string
  options: string[]
  answerStatus: AnswerStatus
  onAnswer: (answer: string) => void
}) {
  const shapes = ['circle', 'square', 'diamond', 'star'] as const
  return (
    <motion.div
      key="quiz-phase"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="parent-question-prompt"
    >
      <div className="parent-question-text">
        <div className="prompt-glow prompt-glow-a" />
        <div className="prompt-glow prompt-glow-b" />
        <AnimatePresence mode="wait">
          <motion.h2
            key={question}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
          >
            {question}
          </motion.h2>
        </AnimatePresence>
      </div>

      <div className="parent-answer-list">
        {options.map((option, index) => (
          <button
            key={option}
            onClick={() => onAnswer(option)}
            disabled={!!answerStatus}
            className="parent-answer-button"
          >
            <div className="answer-shape-wrap">
              <div className="answer-shape-glow" />
              <div className="answer-shape">
                <ShapeIcon shape={shapes[index] || 'circle'} />
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.span
                key={option}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                {option}
              </motion.span>
            </AnimatePresence>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function ShapeIcon({ shape }: { shape: 'circle' | 'square' | 'diamond' | 'star' }) {
  if (shape === 'square') {
    return (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    )
  }
  if (shape === 'diamond') {
    return (
      <svg viewBox="0 0 24 24">
        <polygon points="12,2 22,12 12,22 2,12" />
      </svg>
    )
  }
  if (shape === 'star') {
    return (
      <svg viewBox="0 0 24 24">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

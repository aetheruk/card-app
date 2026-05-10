import confetti from 'canvas-confetti'
import clsx from 'clsx'
import { Sparkles, Trophy, X } from 'lucide-react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { TcgCard } from '../types/tcg'

interface CardDrawRevealProps {
  cards: TcgCard[]
  onComplete: () => void
}

type RarityTier = 'common' | 'uncommon' | 'rare' | 'ultra' | 'secret'

interface RarityTheme {
  tier: RarityTier
  glow: string
  glowColor: string
  borderClass: string
  badgeClass: string
  label: string
  shimmerIntensity: number
  bgGradient: string
}

function getRarityTier(rarity: string | null | undefined): RarityTier {
  const r = (rarity ?? '').toLowerCase()
  if (
    r.includes('hyper') ||
    r.includes('rainbow') ||
    r.includes('secret') ||
    r.includes('black white') ||
    r.includes('holo star') ||
    r.includes('mega hyper') ||
    r.includes('special illustration')
  ) {
    return 'secret'
  }

  if (
    r.includes('ultra') ||
    r.includes('vstar') ||
    r.includes('vmax') ||
    r.includes(' v') ||
    r.includes('gx') ||
    r.includes('ex') ||
    r.includes('radiant') ||
    r.includes('trainer gallery') ||
    r.includes('illustration rare') ||
    r.includes('shiny')
  ) {
    return 'ultra'
  }

  if (
    r.includes('rare holo') ||
    r.includes('rare prism') ||
    r.includes('rare prime') ||
    r.includes('rare break') ||
    r.includes('double rare') ||
    r.includes('ace spec') ||
    r.includes('amazing') ||
    r.includes('legend') ||
    r.startsWith('rare')
  ) {
    return 'rare'
  }

  if (r.includes('uncommon')) return 'uncommon'
  return 'common'
}

function getRarityTheme(rarity: string | null | undefined): RarityTheme {
  const tier = getRarityTier(rarity)
  switch (tier) {
    case 'secret':
      return {
        tier,
        glow:
          '0 0 32px 10px rgba(168,85,247,0.7), 0 0 60px 20px rgba(236,72,153,0.4)',
        glowColor: '#a855f7',
        borderClass: 'secret-border',
        badgeClass: 'secret-badge',
        label: 'Secret Rare',
        shimmerIntensity: 1,
        bgGradient:
          'radial-gradient(ellipse at center, rgba(88,28,135,0.7) 0%, rgba(0,0,0,0) 75%)',
      }
    case 'ultra':
      return {
        tier,
        glow:
          '0 0 28px 8px rgba(251,191,36,0.6), 0 0 55px 16px rgba(245,158,11,0.3)',
        glowColor: '#f59e0b',
        borderClass: 'ultra-border',
        badgeClass: 'ultra-badge',
        label: 'Ultra Rare',
        shimmerIntensity: 0.85,
        bgGradient:
          'radial-gradient(ellipse at center, rgba(120,53,15,0.6) 0%, rgba(0,0,0,0) 75%)',
      }
    case 'rare':
      return {
        tier,
        glow:
          '0 0 24px 7px rgba(99,102,241,0.6), 0 0 45px 14px rgba(79,70,229,0.3)',
        glowColor: '#6366f1',
        borderClass: 'rare-border',
        badgeClass: 'rare-badge',
        label: 'Rare',
        shimmerIntensity: 0.65,
        bgGradient:
          'radial-gradient(ellipse at center, rgba(30,27,75,0.6) 0%, rgba(0,0,0,0) 75%)',
      }
    case 'uncommon':
      return {
        tier,
        glow:
          '0 0 18px 6px rgba(34,197,94,0.4), 0 0 35px 12px rgba(22,163,74,0.2)',
        glowColor: '#22c55e',
        borderClass: 'uncommon-border',
        badgeClass: 'uncommon-badge',
        label: 'Uncommon',
        shimmerIntensity: 0.35,
        bgGradient:
          'radial-gradient(ellipse at center, rgba(5,46,22,0.5) 0%, rgba(0,0,0,0) 75%)',
      }
    default:
      return {
        tier,
        glow: '0 0 14px 4px rgba(156,163,175,0.3)',
        glowColor: '#9ca3af',
        borderClass: 'common-border',
        badgeClass: 'common-badge',
        label: 'Common',
        shimmerIntensity: 0.15,
        bgGradient:
          'radial-gradient(ellipse at center, rgba(30,30,30,0.5) 0%, rgba(0,0,0,0) 75%)',
      }
  }
}

function triggerRarityConfetti(tier: RarityTier) {
  if (tier === 'secret') {
    const duration = 5000
    const end = Date.now() + duration
    const colors = ['#a855f7', '#ec4899', '#f59e0b', '#22d3ee', '#4ade80']
    const loop = window.setInterval(() => {
      if (Date.now() > end) {
        window.clearInterval(loop)
        return
      }
      const t = (end - Date.now()) / duration
      confetti({
        particleCount: Math.floor(70 * t),
        spread: 360,
        startVelocity: 50,
        ticks: 100,
        colors,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
        scalar: 1.2,
        gravity: 0.8,
      })
    }, 250)
    return loop
  }

  if (tier === 'ultra') {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { x: 0.1, y: 0.7 },
      angle: 60,
      colors: ['#f59e0b', '#fde68a', '#fbbf24', '#d97706'],
      startVelocity: 60,
      gravity: 1.1,
    })
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { x: 0.9, y: 0.7 },
      angle: 120,
      colors: ['#f59e0b', '#fde68a', '#fbbf24', '#d97706'],
      startVelocity: 60,
      gravity: 1.1,
    })
  }

  if (tier === 'rare') {
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'],
      scalar: 1.4,
    })
  }

  if (tier === 'uncommon') {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#22c55e', '#86efac', '#4ade80'],
      gravity: 1.2,
    })
  }

  return null
}

function HolographicShimmer({ intensity }: { intensity: number }) {
  return (
    <motion.div
      className="reveal-holo"
      animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    >
      <div
        className="reveal-holo-rainbow"
        style={{
          background: `linear-gradient(
            115deg,
            rgba(255,0,128,${intensity * 0.5}) 0%,
            rgba(255,255,0,${intensity * 0.4}) 15%,
            rgba(0,255,0,${intensity * 0.5}) 30%,
            rgba(0,255,255,${intensity * 0.4}) 45%,
            rgba(0,0,255,${intensity * 0.5}) 60%,
            rgba(255,0,255,${intensity * 0.4}) 75%,
            rgba(255,0,128,${intensity * 0.5}) 90%
          )`,
        }}
      />
      <motion.div
        className="reveal-holo-sparkles"
        animate={{
          backgroundPosition: ['0px 0px', '80px 80px'],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="reveal-holo-sweep"
        style={{
          background: `linear-gradient(
            105deg,
            transparent 35%,
            rgba(255,255,255,${intensity * 0.6}) 50%,
            transparent 65%
          )`,
        }}
        animate={{ backgroundPosition: ['-100% -100%', '200% 200%'] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatDelay: 1,
        }}
      />
    </motion.div>
  )
}

function IdleCardAnimation({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="idle-card-motion"
      animate={{
        y: [0, -8, 0],
        rotateX: [0, 5, 0],
        rotateY: [0, -5, 0],
        rotateZ: [-0.5, 0.5, -0.5],
      }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  )
}

function RevealFlash({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      className="reveal-flash"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 0.4, ease: 'circOut' }}
      onAnimationComplete={onDone}
    />
  )
}

function DotProgress({
  total,
  current,
  revealed,
}: {
  total: number
  current: number
  revealed: Set<number>
}) {
  return (
    <div className="reveal-dots">
      {Array.from({ length: total }).map((_, index) => (
        <motion.div
          key={index}
          className={clsx(
            'reveal-dot',
            index === current && 'current',
            revealed.has(index) && 'revealed',
          )}
          layoutId={`dot-${index}`}
        />
      ))}
    </div>
  )
}

function SummaryGrid({
  cards,
  onClose,
}: {
  cards: TcgCard[]
  onClose: () => void
}) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 },
    },
  }
  const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.6, y: 30, rotateX: 20 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,
      transition: { type: 'spring', stiffness: 260, damping: 20 },
    },
  }

  return (
    <motion.div
      className="reveal-summary"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="summary-bg summary-bg-a" />
      <div className="summary-bg summary-bg-b" />
      <header className="summary-header">
        <div>
          <Trophy size={20} />
          <h2>Collection Summary</h2>
          <Trophy size={20} />
        </div>
        <p>You obtained {cards.length} new cards</p>
      </header>
      <motion.div
        className="summary-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {cards.map((card, index) => {
          const theme = getRarityTheme(card.rarity)
          return (
            <motion.article
              key={`${card.id}-${index}`}
              variants={itemVariants}
              className="summary-card"
            >
              <div className="summary-card-frame" style={{ boxShadow: theme.glow }}>
                <img
                  src={card.images.large || card.images.small}
                  alt={card.name}
                />
              </div>
              <strong>{card.name}</strong>
              <span className={theme.badgeClass}>{theme.label}</span>
            </motion.article>
          )
        })}
      </motion.div>
      <footer className="summary-footer">
        <button className="reveal-action primary" onClick={onClose}>
          Add to Collection
        </button>
      </footer>
    </motion.div>
  )
}

export function CardDrawReveal({ cards, onComplete }: CardDrawRevealProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set())
  const [isFlipping, setIsFlipping] = useState(false)
  const [showFlash, setShowFlash] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const confettiIntervalRef = useRef<number | null>(null)

  const currentCard = cards[currentIndex]
  const isLastCard = currentIndex === cards.length - 1
  const isCurrentRevealed = revealedIndices.has(currentIndex)
  const currentTheme = getRarityTheme(currentCard?.rarity)

  const clearConfettiInterval = useCallback(() => {
    if (confettiIntervalRef.current) {
      window.clearInterval(confettiIntervalRef.current)
      confettiIntervalRef.current = null
    }
  }, [])

  const handleNext = useCallback(() => {
    clearConfettiInterval()
    if (isLastCard) {
      setShowSummary(true)
      return
    }
    setCurrentIndex((prev) => prev + 1)
  }, [clearConfettiInterval, isLastCard])

  const handleReveal = useCallback(() => {
    if (isFlipping) return
    if (isCurrentRevealed) {
      handleNext()
      return
    }

    setIsFlipping(true)
    setRevealedIndices((prev) => new Set(prev).add(currentIndex))
    setShowFlash(true)
    navigator.vibrate?.(50)

    window.setTimeout(() => {
      setIsFlipping(false)
      clearConfettiInterval()
      const interval = triggerRarityConfetti(currentTheme.tier)
      if (interval) confettiIntervalRef.current = interval
    }, 400)
  }, [
    clearConfettiInterval,
    currentIndex,
    currentTheme.tier,
    handleNext,
    isCurrentRevealed,
    isFlipping,
  ])

  const stars = useMemo(
    () =>
      Array.from({ length: 35 }).map(() => ({
        width: Math.random() * 2 + 1,
        height: Math.random() * 2 + 1,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 4,
      })),
    [],
  )

  useEffect(() => {
    setIsFlipping(false)
    return () => clearConfettiInterval()
  }, [clearConfettiInterval, currentIndex])

  useEffect(() => {
    cards.forEach((card) => {
      const src = card.images.large || card.images.small
      if (!src) return
      const image = new Image()
      image.src = src
    })
  }, [cards])

  if (!currentCard) return null
  if (showSummary) return <SummaryGrid cards={cards} onClose={onComplete} />

  return (
    <div className="parent-card-reveal">
      <AnimatePresence>
        {showFlash && <RevealFlash onDone={() => setShowFlash(false)} />}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentTheme.tier}-${currentIndex}`}
          className="reveal-ambient"
          style={{ background: currentTheme.bgGradient }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isCurrentRevealed ? 1 : 0.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      </AnimatePresence>
      <div className="reveal-stars">
        {stars.map((star, index) => (
          <span
            key={index}
            style={{
              width: star.width,
              height: star.height,
              top: star.top,
              left: star.left,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
      </div>
      <button className="reveal-close" onClick={onComplete} aria-label="Close">
        <X size={24} />
      </button>

      <div className="reveal-top">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="reveal-kicker"
        >
          <p>{isCurrentRevealed ? 'Revealed' : 'New Card'}</p>
          <div />
        </motion.div>
        <DotProgress
          total={cards.length}
          current={currentIndex}
          revealed={revealedIndices}
        />
      </div>

      <div className="reveal-center">
        <button className="reveal-card-tap" onClick={handleReveal}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentIndex}
              initial={{ scale: 0.6, opacity: 0, y: 100, rotateY: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotateY: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -60, rotateY: -30 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className="reveal-card-stage"
            >
              <AnimatePresence>
                {isCurrentRevealed && (
                  <motion.div
                    className="reveal-card-glow"
                    style={{
                      background: currentTheme.glowColor,
                      opacity: 0.4,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                  />
                )}
              </AnimatePresence>

              <motion.div
                className="reveal-card-3d"
                animate={{ rotateY: isCurrentRevealed ? 180 : 0 }}
                transition={{
                  duration: 0.7,
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                }}
              >
                <div className="reveal-card-face reveal-card-back-face">
                  {!isCurrentRevealed ? (
                    <IdleCardAnimation>
                      <div className="reveal-back-wrap">
                        <img src="/tcg-back.png" alt="Card back" />
                        <motion.div
                          className="reveal-back-shine"
                          animate={{
                            backgroundPosition: ['-100% -100%', '300% 300%'],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                        />
                      </div>
                    </IdleCardAnimation>
                  ) : (
                    <div className="reveal-back-filler" />
                  )}
                </div>

                <div
                  className={clsx(
                    'reveal-card-face reveal-card-front-face',
                    currentTheme.borderClass,
                  )}
                  style={{ boxShadow: currentTheme.glow }}
                >
                  <img
                    src={currentCard.images.large || currentCard.images.small}
                    alt={currentCard.name}
                  />
                  {isCurrentRevealed && currentTheme.shimmerIntensity > 0 && (
                    <HolographicShimmer
                      intensity={currentTheme.shimmerIntensity}
                    />
                  )}
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </button>

        <div className="reveal-details">
          <AnimatePresence mode="wait">
            {isCurrentRevealed && (
              <motion.div
                key={`details-${currentIndex}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="reveal-detail-content"
              >
                <h3>{currentCard.name}</h3>
                <span className={currentTheme.badgeClass}>
                  <Sparkles size={12} />
                  {currentTheme.label}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="reveal-bottom">
        <button
          onClick={handleReveal}
          className={clsx(
            'reveal-action',
            isCurrentRevealed ? 'next' : 'primary',
          )}
        >
          {isCurrentRevealed
            ? isLastCard
              ? 'View Summary'
              : 'Next Card'
            : 'Reveal Card'}
        </button>
      </div>
    </div>
  )
}

import type { TcgCard } from '../types/tcg'

interface CardImageProps {
  card: TcgCard
  className?: string
  hidden?: boolean
}

export function CardImage({
  card,
  className = '',
  hidden = false,
}: CardImageProps) {
  return (
    <img
      className={`card-image ${className}`}
      src={
        hidden
          ? '/tcg-back.png'
          : card.images.small || card.images.large || '/icon.svg'
      }
      alt={hidden ? 'Uncollected card' : card.name}
      loading="lazy"
      onError={(event) => {
        event.currentTarget.src = hidden ? '/tcg-back.png' : '/icon.svg'
      }}
    />
  )
}

import { useEffect, useRef } from 'react'
import './PriceActionBackground.css'

const PriceActionBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Animation state
    let animationId: number
    const candlesticks: Candlestick[] = []
    const numCandles = 40
    let time = 0

    interface Candlestick {
      x: number
      open: number
      close: number
      high: number
      low: number
      bullish: boolean
      opacity: number
    }

    // Initialize candlesticks
    const initializeCandlesticks = () => {
      const centerY = canvas.height / 2
      let prevClose = centerY

      for (let i = 0; i < numCandles; i++) {
        const isBullish = Math.random() > 0.5
        const bodySize = 20 + Math.random() * 40
        const wickSize = bodySize * (0.5 + Math.random())

        const open = prevClose
        const close = isBullish ? open + bodySize : open - bodySize
        const high = Math.max(open, close) + wickSize
        const low = Math.min(open, close) - wickSize

        candlesticks.push({
          x: (i / numCandles) * canvas.width,
          open,
          close,
          high,
          low,
          bullish: isBullish,
          opacity: 0.15 + Math.random() * 0.2
        })

        prevClose = close
      }
    }

    initializeCandlesticks()

    // Draw candlestick
    const drawCandle = (candle: Candlestick) => {
      const candleWidth = canvas.width / numCandles * 0.7
      const x = candle.x

      // Set color based on bull/bear
      const color = candle.bullish
        ? `rgba(16, 185, 129, ${candle.opacity})`
        : `rgba(239, 68, 68, ${candle.opacity})`

      // Draw wick
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, candle.high)
      ctx.lineTo(x, candle.low)
      ctx.stroke()

      // Draw body
      ctx.fillStyle = color
      const bodyHeight = Math.abs(candle.close - candle.open)
      const bodyY = Math.min(candle.open, candle.close)
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight)
    }

    // Animate candlesticks
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      time += 0.01

      // Update and draw candlesticks
      candlesticks.forEach((candle, index) => {
        // Animate with wave motion
        const wave = Math.sin(time + index * 0.3) * 15
        const tempCandle = {
          ...candle,
          open: candle.open + wave,
          close: candle.close + wave,
          high: candle.high + wave,
          low: candle.low + wave
        }
        drawCandle(tempCandle)

        // Pulse opacity
        candle.opacity = 0.15 + Math.sin(time * 2 + index) * 0.1
      })

      // Draw trend lines
      ctx.strokeStyle = 'rgba(147, 51, 234, 0.2)'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 5])
      ctx.beginPath()
      ctx.moveTo(0, canvas.height * 0.3 + Math.sin(time) * 20)
      ctx.lineTo(canvas.width, canvas.height * 0.7 + Math.cos(time) * 20)
      ctx.stroke()
      ctx.setLineDash([])

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="price-action-canvas"
    />
  )
}

export default PriceActionBackground

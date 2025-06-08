import { CellSummary } from '../summaries/cellSummary'
import { GameSummary } from '../summaries/gameSummary'
import { ManifoldSummary } from '../summaries/manifoldSummary'
import { Client } from './client'
import { Rect, SVG, Svg } from '@svgdotjs/svg.js'

export class Renderer {
  manifold?: ManifoldSummary
  client: Client
  svg: Svg
  squares: Rect[] = []
  teamDiv1 = document.getElementById('teamDiv1') as HTMLDivElement
  teamDiv2 = document.getElementById('teamDiv2') as HTMLDivElement
  titleDiv1 = document.getElementById('titleDiv1') as HTMLDivElement
  titleDiv2 = document.getElementById('titleDiv2') as HTMLDivElement
  scoreDiv1 = document.getElementById('scoreDiv1') as HTMLDivElement
  scoreDiv2 = document.getElementById('scoreDiv2') as HTMLDivElement
  countdownDiv1 = document.getElementById('countdownDiv1') as HTMLDivElement
  countdownDiv2 = document.getElementById('countdownDiv2') as HTMLDivElement
  game: GameSummary

  choiceColors = [
    'hsl(0, 0%, 0%)',
    'hsl(200, 100%, 50%)',
    'hsl(120, 75%, 40%)'
  ]

  stateColors = [
    'hsl(0, 0%, 0%)',
    'hsl(0, 0%, 20%)'
  ]

  constructor (client: Client) {
    this.client = client
    this.game = new GameSummary(1)
    this.svg = SVG()
    this.svg.addTo('#svgDiv')
    this.svg.size('100vmin', '100vmin')
    this.teamDiv1.style.color = this.choiceColors[1]
    this.teamDiv2.style.color = this.choiceColors[2]
  }

  setup (): void {
    this.game = this.client.game
    this.manifold = this.client.manifold
    if (this.manifold == null) return
    const size = this.manifold.size
    const mid = 0.5 * (this.manifold.size - 1)
    const padding = 0.5
    this.svg.viewbox(`-${padding} -${padding} ${size + 2 * padding} ${size + 2 * padding}`)
    this.squares = []
    this.manifold.cells.forEach(cell => {
      const color = this.getColor(cell)
      const rect = this.svg.rect(1, 1)
      this.squares[cell.index] = rect
      rect.fill(color)
      rect.move(cell.x, cell.y)
      rect.attr('shape-rendering', 'crispEdges')
      rect.click(_ => {
        if (this.game.state !== 'decision') return
        if (cell.x === mid && cell.y === mid) return
        const otherTeam = this.game.team === 1 ? this.game.teams[2] : this.game.teams[1]
        if (otherTeam.oldChoices.includes(cell.index)) return
        if (cell.index === this.client.choices[0]) {
          this.client.choices = []
        } else {
          this.client.choices = [cell.index]
        }
        this.updateManifold()
        this.client.socket.emit('choices', this.client.choices)
      })
    })
  }

  getColor (cell: CellSummary): string {
    const chosen = this.client.choices.includes(cell.index)
    if (chosen && this.game.state === 'decision') {
      return this.stateColors[1 - cell.state]
    }
    return this.stateColors[cell.state]
  }

  update (): void {
    this.game = this.client.game
    this.updateManifold()
    this.updateInfo()
  }

  updateManifold (): void {
    this.manifold = this.client.manifold
    if (this.manifold == null) return
    const team1 = this.game.teams[1]
    const team2 = this.game.teams[2]
    const myTeam = this.game.team === 1 ? team1 : team2
    const otherTeam = this.game.team === 1 ? team2 : team1
    this.manifold.cells.forEach(cell => {
      const rect = this.squares[cell.index]
      if (rect == null) return
      rect.fill(this.getColor(cell))
      rect.stroke({ color: 'black', opacity: 0, width: 0.1 })
    })
    this.manifold.cells.forEach(cell => {
      if (this.client.choices.length > 0) return
      const rect = this.squares[cell.index]
      if (rect == null) return
      if (myTeam.oldChoices.includes(cell.index)) {
        rect.front()
        const color = this.choiceColors[this.game.team]
        rect.stroke({ color, opacity: 1, width: 0.05 })
      }
    })
    this.manifold.cells.forEach(cell => {
      const rect = this.squares[cell.index]
      if (rect == null) return
      if (otherTeam.oldChoices.includes(cell.index)) {
        rect.front()
        const color = this.choiceColors[3 - this.game.team]
        rect.stroke({ color, opacity: 1, width: 0.05 })
      }
    })
    this.manifold.cells.forEach(cell => {
      if (this.client.choices.length === 0) return
      const rect = this.squares[cell.index]
      if (rect == null) return
      if (this.client.choices.includes(cell.index)) {
        rect.front()
        const color = this.choiceColors[this.game.team]
        rect.stroke({ color, opacity: 1, width: 0.05 })
      }
    })
    const mid = 0.5 * (this.manifold.size - 1)
    this.manifold.cells.forEach(cell => {
      if (cell.x !== mid || cell.y !== mid) return
      const rect = this.squares[cell.index]
      if (rect == null) return
      rect.front()
      const color = 'hsl(50, 100%, 50%)'
      rect.stroke({ color, opacity: 1, width: 0.05 })
    })
  }

  updateInfo (): void {
    const team1 = this.game.teams[1]
    const team2 = this.game.teams[2]
    this.scoreDiv1.innerHTML = `Cells: ${team1.cellCount}`
    this.scoreDiv2.innerHTML = `Cells: ${team2.cellCount}`
    this.countdownDiv1.innerHTML = `Countdown: ${this.game.countdown}`
    this.countdownDiv2.innerHTML = `Countdown: ${this.game.countdown}`
    if (this.game.state === 'action') {
      this.titleDiv1.innerHTML = 'Action'
      this.titleDiv2.innerHTML = 'Action'
    }
    if (this.game.state === 'decision') {
      this.titleDiv1.innerHTML = team1.ready ? 'Ready' : 'Thinking'
      this.titleDiv2.innerHTML = team2.ready ? 'Ready' : 'Thinking'
      if (!team1.ready && !team2.ready) {
        this.countdownDiv1.innerHTML = ''
        this.countdownDiv2.innerHTML = ''
      }
    }
    if (this.game.state === 'victory') {
      this.titleDiv1.innerHTML = team1.victory ? 'VICTORY!' : ''
      this.titleDiv2.innerHTML = team2.victory ? 'VICTORY!' : ''
    }
  }
}

import { Manifold } from './manifold'
import { choose } from './math'
import { Player } from './player'
import { Server } from './server'
import { GameSummary } from './summaries/gameSummary'
import { Team } from './team'

export class Game {
  server = new Server()
  manifold = new Manifold()
  teams: Record<number, Team> = {}
  players: Player[] = []
  token = String(Math.random())
  timeScale: number
  countdown: number
  maxCountdown: number
  decisionCount = 0
  maxReserve = 2
  stepInterval = 0.5
  state = 'decision'
  decisionSteps = 15
  actionSteps = 8
  victorySteps = 30

  constructor () {
    this.teams[1] = new Team(1)
    this.teams[2] = new Team(2)
    this.setupIo()
    this.timeScale = this.server.config.timeScale
    this.maxCountdown = this.decisionSteps
    this.countdown = this.maxCountdown
    setInterval(() => this.step(), 1000 * this.stepInterval / this.timeScale)
  }

  setupIo (): void {
    this.server.io.on('connection', socket => {
      const player = new Player(this, socket)
      this.players.push(player)
      console.log('connect:', socket.id)
      socket.emit('connected')
      socket.emit('setup', this.manifold.summary)
      socket.on('choices', (choices: number[]) => {
        if (choices.length === 0) return
        if (this.state === 'decision') {
          const team = this.teams[player.team]
          team.choices = [choices[0]]
          team.ready = true
        }
      })
      socket.on('disconnect', () => {
        console.log('disconnect:', socket.id)
        this.players = this.players.filter(p => p.id !== socket.id)
      })
    })
  }

  step (): void {
    if (this.state === 'action') {
      this.action()
    } else if (this.state === 'decision') {
      this.decision()
    } else if (this.state === 'victory') {
      this.victory()
    }
    const summary1 = new GameSummary(1, this)
    const summary2 = new GameSummary(2, this)
    this.players.forEach(player => {
      const summary = player.team === 1 ? summary1 : summary2
      player.socket.emit('step', summary)
    })
  }

  action (): void {
    this.countdown = Math.max(0, this.countdown - 1)
    this.manifold.step()
    if (this.countdown === 0) {
      this.state = 'decision'
      this.countdown = this.decisionSteps
      this.maxCountdown = this.decisionSteps
    }
    this.score()
  }

  decision (): void {
    if (this.teams[1].ready || this.teams[2].ready) {
      this.countdown = Math.max(0, this.countdown - 1)
    }
    const playerCount1 = this.getPlayerCount(1)
    const playerCount2 = this.getPlayerCount(2)
    const playerCount = playerCount1 + playerCount2
    const ready1 = this.teams[1].ready || playerCount1 === 0
    const ready2 = this.teams[2].ready || playerCount2 === 0
    const ready = ready1 && ready2 && playerCount > 0
    if (ready || this.countdown === 0) {
      if (playerCount1 === 0) this.teams[1].choices = [this.getBotChoice()]
      if (playerCount2 === 0) this.teams[2].choices = [this.getBotChoice()]
      this.deploy()
      this.teams[1].ready = false
      this.teams[2].ready = false
      this.state = 'action'
      this.countdown = this.actionSteps
      this.maxCountdown = this.actionSteps
    }
  }

  victory (): void {
    this.countdown = Math.max(0, this.countdown - 1)
    if (this.countdown === 0) {
      this.restart()
    }
  }

  deploy (): void {
    this.decisionCount += 1
    const choice1 = this.teams[1].choices[0]
    const choice2 = this.teams[2].choices[0]
    this.teams[1].oldChoices = [choice1]
    this.teams[2].oldChoices = [choice2]
    this.countdown = this.decisionSteps
    this.maxCountdown = this.actionSteps
    if (choice1 != null) {
      const cell = this.manifold.cells[choice1]
      cell.state = 1 - cell.state
    }
    if (choice2 != null) {
      const cell = this.manifold.cells[choice2]
      cell.state = 1 - cell.state
    }
    Object.values(this.teams).forEach(team => {
      team.choices = []
    })
    Object.values(this.teams).forEach(team => {
      team.reserve = this.maxReserve
    })
  }

  score (): void {
    this.teams[1].victory = false
    this.teams[2].victory = false
    if (this.teams[1].score > 10) {
      this.teams[1].victory = true
    }
    if (this.teams[2].score > 10) {
      this.teams[2].victory = true
    }
    if (this.teams[1].victory || this.teams[2].victory) {
      this.state = 'victory'
      this.countdown = this.victorySteps
      this.maxCountdown = this.victorySteps
    }
  }

  restart (): void {
    this.manifold = new Manifold()
    this.manifold.summary = this.manifold.summarize()
    this.teams[1] = new Team(1)
    this.teams[2] = new Team(2)
    this.players.forEach(player => {
      player.team = 0
    })
    this.players.forEach(player => {
      const smallTeam = this.getSmallTeam()
      player.team = smallTeam
    })
    this.countdown = this.decisionSteps
    this.decisionCount = 0
    this.state = 'decision'
    this.players.forEach(player => {
      player.socket.emit('setup', this.manifold.summary)
    })
  }

  getSmallTeam (): number {
    const playerCount1 = this.getPlayerCount(1)
    const playerCount2 = this.getPlayerCount(2)
    if (playerCount2 > playerCount1) return 1
    if (playerCount1 > playerCount2) return 2
    return choose([1, 2])
  }

  getPlayerCount (team: number): number {
    const teamPlayers = this.players.filter(p => p.team === team)
    return teamPlayers.length
  }

  getBotChoice (): number {
    const mid = 0.5 * (this.manifold.size - 1)
    const validCells = this.manifold.cells.filter(cell => {
      if (cell.x === mid && cell.y === mid) return false
      if (this.teams[1].oldChoices.includes(cell.index)) return false
      if (this.teams[2].oldChoices.includes(cell.index)) return false
      return true
    })
    const options = validCells.map(c => c.index)
    return choose(options)
  }
}

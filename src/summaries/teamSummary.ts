import { Team } from '../team'

export class TeamSummary {
  oldChoices: number[] = []
  cellCount = 0
  victory = false
  ready = false

  constructor (team?: Team) {
    if (team != null) {
      this.oldChoices = team.oldChoices
      this.cellCount = team.score
      this.victory = team.victory
      this.ready = team.ready
    }
  }
}

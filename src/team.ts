export class Team {
  choices: number[] = []
  oldChoices: number[] = []
  score = 0
  reserve = 2
  victory = false
  ready = false
  index: number

  constructor (index: number) {
    this.index = index
  }
}

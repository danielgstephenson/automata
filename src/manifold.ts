import { Cell } from './cell'
import { choose, range } from './math'
import { CellSummary } from './summaries/cellSummary'
import { ManifoldSummary } from './summaries/manifoldSummary'

export class Manifold {
  size = 9
  cells: Cell[] = []
  grid: Cell[][] = range(this.size).map(() => [])
  summary: ManifoldSummary

  constructor () {
    this.buildCells()
    this.summary = this.summarize()
  }

  step (): void {
    this.summary = this.summarize()
  }

  countNeighbors (cell: CellSummary, manifold: ManifoldSummary, state: number): number {
    const neighbors = cell.neighbors.filter(i => {
      const neighbor = manifold.cells[i]
      return neighbor.state === state
    })
    return neighbors.length
  }

  buildCells (): void {
    range(this.size).forEach(x => {
      range(this.size).forEach(y => {
        const index = this.cells.length
        const cell = new Cell(index, x, y)
        this.cells.push(cell)
        this.grid[x][y] = cell
      })
    })
    this.cells.forEach(cell => {
      const x = cell.x
      const y = cell.y
      const min = 0
      const max = this.size - 1
      if (x < max) cell.neighbors[0] = this.grid[x + 1][y]
      if (y < max) cell.neighbors[1] = this.grid[x][y + 1]
      if (x > min) cell.neighbors[2] = this.grid[x - 1][y]
      if (y > min) cell.neighbors[3] = this.grid[x][y - 1]
    })
    this.initialize()
  }

  initialize (): void {
    const flips = Math.ceil(0.25 * this.size * this.size)
    range(flips).forEach(_ => {
      const cell1 = choose(this.cells)
      const x2 = this.size - 1 - cell1.x
      const y2 = this.size - 1 - cell1.y
      const cell2 = this.grid[x2][y2]
      const newState = cell1.state === 0 ? 1 : 0
      cell1.state = newState
      cell2.state = newState
    })
  }

  summarize (): ManifoldSummary {
    return new ManifoldSummary(this)
  }
}

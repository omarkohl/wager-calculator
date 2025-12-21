import { useState } from 'react'
import InlineEdit from './components/InlineEdit'
import StakesSelector from './components/StakesSelector'
import ParticipantsList from './components/ParticipantsList'
import type { Participant } from './types/wager'

function App() {
  const [claim, setClaim] = useState('')
  const [details, setDetails] = useState('')
  const [stakes, setStakes] = useState('usd')
  const [participants, setParticipants] = useState<Participant[]>([
    { id: crypto.randomUUID(), name: 'Artem', maxBet: 0 },
    { id: crypto.randomUUID(), name: 'Baani', maxBet: 0 },
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Wager</h1>
          <p className="mt-2 text-sm text-gray-600">
            Calculate fair betting odds using Brier scoring
          </p>
        </header>

        <main className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-6 flex justify-end gap-3">
            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Reset Form
            </button>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
            >
              Share Wager
            </button>
          </div>

          {/* Claim & Details Section */}
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Claim</label>
              <InlineEdit
                value={claim}
                onChange={setClaim}
                placeholder="What are you betting on?"
                displayClassName="text-lg font-semibold"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Details <span className="text-gray-400">(Optional)</span>
              </label>
              <InlineEdit
                value={details}
                onChange={setDetails}
                placeholder="Add resolution criteria or context..."
                multiline
                displayClassName="text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Stakes</label>
              <StakesSelector value={stakes} onChange={value => value && setStakes(value)} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Participants & Max Bets
              </label>
              <ParticipantsList
                participants={participants}
                onChange={setParticipants}
                stakes={stakes}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App

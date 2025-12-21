function App() {
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

          {/* Form content will go here */}
          <div className="text-center text-gray-500">Form coming soon...</div>
        </main>
      </div>
    </div>
  )
}

export default App

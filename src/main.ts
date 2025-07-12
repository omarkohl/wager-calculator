import './styles/main.css'

// Simple initial setup to verify Vite is working
const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="container">
    <header>
      <h1>Wager Calculator</h1>
      <p>Fair betting odds using logarithmic scoring rules</p>
    </header>
    <main>
      <p>Development environment is ready!</p>
      <p>Time to start building with TDD...</p>
    </main>
  </div>
`

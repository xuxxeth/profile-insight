import './App.css';

function App() {
  return (
    <main><div className="mark">⚡</div><div><strong>Profile Insight · 免费</strong><p>配置自己的大模型 API，然后分析 X 用户主页。</p></div><button onClick={() => browser.runtime.openOptionsPage()}>配置大模型 API</button></main>
  );
}

export default App;

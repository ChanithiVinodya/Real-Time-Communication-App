import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Room from './pages/Room';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/room/:roomCode" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}

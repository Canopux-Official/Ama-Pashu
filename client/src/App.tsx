// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import AppLayout from './components/AppLayout';
import Home from './pages/Home';
import AddCow from './pages/AddCow'; // Import the new page
import SearchCow from './pages/SearchCow';
import CowProfile from './pages/CowProfile';
import MyCows from './pages/MyCows';
import UserProfile from './pages/UserProfile';
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/add" element={<AddCow />} />
            <Route path="/search" element={<SearchCow />} />    {/* Add This */}
            <Route path="/cow/:id" element={<CowProfile />} />
            <Route path="/my-cows" element={<MyCows />} />
            <Route path="/profile" element={<UserProfile />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
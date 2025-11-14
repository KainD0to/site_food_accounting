import React, { useState, useEffect } from 'react';
import {
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Tabs,
  Tab
} from '@mui/material';

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000'
  : 'https://site-food-accounting.onrender.com';

// Тема Material-UI
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Компонент входа
function Login({ onLogin, onError }) {
  const [formData, setFormData] = useState({
    full_name: '',
    password: '',
    student_id: '',
    userType: 'parent'
  });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setFormData({
      full_name: '',
      password: '',
      student_id: '',
      userType: newValue === 0 ? 'parent' : 'admin'
    });
    setLoginError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      console.log('🚀 Отправка запроса на вход...');
      
      if (tabValue === 0) {
        // Вход по ID студента (родитель/ученик)
        if (!formData.student_id.trim()) {
          throw new Error('Введите ID ученика');
        }

        const response = await fetch(`${API_BASE}/api/student/login/${formData.student_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log('📨 Ответ получен, статус:', response.status);

        const data = await response.json();
        console.log('📊 Данные ответа:', data);

        if (!response.ok) {
          throw new Error(data.error || `Ошибка: ${response.status}`);
        }

        console.log('✅ Успешный вход по ID студента!');
        onLogin(data.user, data.token);

      } else {
        // Вход администратора
        if (!formData.full_name || !formData.password) {
          throw new Error('Заполните все поля');
        }

        const response = await fetch(`${API_BASE}/api/admin/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: formData.full_name,
            password: formData.password
          })
        });

        console.log('📨 Ответ получен, статус:', response.status);

        const data = await response.json();
        console.log('📊 Данные ответа:', data);

        if (!response.ok) {
          throw new Error(data.error || `Ошибка: ${response.status}`);
        }

        console.log('✅ Успешный вход администратора!');
        onLogin(data.user, data.token);
      }
      
    } catch (error) {
      console.error('❌ Ошибка входа:', error);
      setLoginError(error.message);
      onError('Ошибка входа: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAdminLogin = () => {
    setFormData({
      full_name: 'Тест админ',
      password: '1357911Dan',
      student_id: '',
      userType: 'admin'
    });
  };

  const handleStudentLogin = (studentId) => {
    setFormData({
      full_name: '',
      password: '',
      student_id: studentId,
      userType: 'parent'
    });
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            🍎 Система учета питания
          </Typography>
          
          <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 3 }}>
            <Tab label="Родитель/Ученик" />
            <Tab label="Администратор" />
          </Tabs>

          {loginError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loginError}
            </Alert>
          )}

          <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Тестовые данные:</strong><br/>
              {tabValue === 0 ? (
                <>
                  <Button onClick={() => handleStudentLogin('1001')} size="small" disabled={loading}>
                    Ученик ID: 1001
                  </Button>
                  <br/>
                  <Button onClick={() => handleStudentLogin('1002')} size="small" disabled={loading}>
                    Ученик ID: 1002
                  </Button>
                  <br/>
                  <Button onClick={() => handleStudentLogin('1003')} size="small" disabled={loading}>
                    Ученик ID: 1003
                  </Button>
                </>
              ) : (
                <Button onClick={handleAdminLogin} size="small" disabled={loading}>
                  Админ: Тест админ / 1357911Dan
                </Button>
              )}
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {tabValue === 0 ? (
              // Форма для родителя/ученика
              <TextField
                margin="normal"
                required
                fullWidth
                label="ID ученика"
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                disabled={loading}
                placeholder="Введите номер ученика"
                helperText="Введите ID ученика для просмотра баланса"
              />
            ) : (
              // Форма для администратора
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="ФИО"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="username"
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Пароль"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </>
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 1 }}
              disabled={loading}
            >
              {loading ? 'Вход...' : tabValue === 0 ? 'Посмотреть баланс' : 'Войти'}
            </Button>
          </Box>

          {tabValue === 0 && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              💡 Для входа просто введите ID ученика. Пароль не требуется.
            </Typography>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

// Панель пользователя (общая для родителей и учеников)
function UserDashboard({ user, onLogout, onNotification }) {
  const [payments, setPayments] = useState([]);
  const [showPayments, setShowPayments] = useState(false);

  useEffect(() => {
    if (user.role !== 'admin') {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔐 Token для платежей:', token);
      
      const response = await fetch(`${API_BASE}/api/students/${user.id}/payments`, {
        headers: {
          'Authorization': token
        }
      });
      
      console.log('📊 Статус ответа платежей:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Данные платежей:', data);
      setPayments(data);
    } catch (error) {
      console.error('❌ Ошибка загрузки платежей:', error);
      onNotification('Ошибка загрузки платежей: ' + error.message, 'error');
    }
  };

  const togglePayments = () => {
    setShowPayments(!showPayments);
    if (!showPayments) {
      fetchPayments();
    }
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {user.role === 'admin' ? 'Панель администратора' : 'Личный кабинет'}
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user.full_name}
            {user.student_id && ` (ID: ${user.student_id})`}
          </Typography>
          <Button color="inherit" onClick={onLogout}>Выйти</Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        {user.role === 'admin' ? (
          <AdminDashboardContent 
            user={user} 
            onNotification={onNotification} 
          />
        ) : (
          <Box>
            <Typography variant="h4" gutterBottom>
              {user.parent_name ? `Ученик: ${user.full_name}` : 'Мой баланс'}
            </Typography>

            <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {user.full_name}
                </Typography>
                {user.student_id && (
                  <Typography color="textSecondary" gutterBottom>
                    ID ученика: {user.student_id}
                  </Typography>
                )}
                {user.parent_name && (
                  <Typography color="textSecondary" gutterBottom>
                    Родитель: {user.parent_name}
                  </Typography>
                )}
                <Typography variant="h4" sx={{ mt: 2, color: 'primary.main' }}>
                  Баланс: {user.balance || 0} ₽
                </Typography>
                <Button 
                  onClick={togglePayments}
                  sx={{ mt: 2 }}
                  variant="outlined"
                  fullWidth
                >
                  {showPayments ? 'Скрыть' : 'Показать'} историю платежей
                </Button>
              </CardContent>
            </Card>

            {showPayments && payments.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom>
                  История платежей
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Дата</TableCell>
                        <TableCell>Сумма</TableCell>
                        <TableCell>Описание</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.payment_date}</TableCell>
                          <TableCell>{payment.amount} ₽</TableCell>
                          <TableCell>{payment.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {showPayments && payments.length === 0 && (
              <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 2 }}>
                История платежей отсутствует
              </Typography>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}

// Компонент администратора
function AdminDashboardContent({ user, onNotification }) {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    description: '',
    payment_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('🔐 Token для студентов:', token);
      
      const response = await fetch(`${API_BASE}/api/students`, {
        headers: {
          'Authorization': token
        }
      });
      
      console.log('📊 Статус ответа студентов:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Данные студентов:', data);
      setStudents(data);
    } catch (error) {
      console.error('❌ Ошибка загрузки студентов:', error);
      onNotification('Ошибка загрузки студентов: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔐 Token для истории:', token);
      
      const response = await fetch(`${API_BASE}/api/students/${studentId}/payments`, {
        headers: {
          'Authorization': token
        }
      });
      
      console.log('📊 Статус ответа истории:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Данные истории:', data);
      setPayments(data);
      setSelectedStudent(studentId);
    } catch (error) {
      console.error('❌ Ошибка загрузки платежей:', error);
      onNotification('Ошибка загрузки платежей: ' + error.message, 'error');
    }
  };

  const handleAddPayment = async () => {
    try {
      if (!paymentData.amount || !paymentData.description) {
        throw new Error('Заполните все поля');
      }

      const token = localStorage.getItem('token');
      console.log('🔐 Token для добавления платежа:', token);
      
      const response = await fetch(`${API_BASE}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          ...paymentData,
          student_id: selectedStudent,
          amount: parseFloat(paymentData.amount)
        })
      });

      console.log('📊 Статус ответа добавления:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка: ${response.status}`);
      }
      
      onNotification('Платеж успешно добавлен', 'success');
      setPaymentDialogOpen(false);
      setPaymentData({ amount: '', description: '', payment_date: new Date().toISOString().split('T')[0] });
      fetchStudents();
      if (selectedStudent) fetchPayments(selectedStudent);
    } catch (error) {
      console.error('❌ Ошибка добавления платежа:', error);
      onNotification('Ошибка добавления платежа: ' + error.message, 'error');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Управление счетами студентов
      </Typography>

      {loading ? (
        <Typography>Загрузка студентов...</Typography>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>ФИО студента</strong></TableCell>
                  <TableCell><strong>ID студента</strong></TableCell>
                  <TableCell><strong>Родитель</strong></TableCell>
                  <TableCell><strong>Баланс</strong></TableCell>
                  <TableCell><strong>Действия</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id} hover>
                    <TableCell>{student.full_name}</TableCell>
                    <TableCell>{student.student_id}</TableCell>
                    <TableCell>{student.parent_name || 'Не указан'}</TableCell>
                    <TableCell>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: student.balance > 0 ? 'success.main' : 'error.main',
                          fontWeight: 'bold'
                        }}
                      >
                        {student.balance} ₽
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button 
                        onClick={() => fetchPayments(student.id)}
                        sx={{ mr: 1 }}
                        variant="outlined"
                        size="small"
                      >
                        История
                      </Button>
                      <Button 
                        variant="contained"
                        size="small"
                        onClick={() => {
                          setSelectedStudent(student.id);
                          setPaymentDialogOpen(true);
                        }}
                      >
                        Пополнить
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {students.length === 0 && (
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 4 }}>
              Студенты не найдены
            </Typography>
          )}
        </>
      )}

      {selectedStudent && payments.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            История платежей студента
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Дата</strong></TableCell>
                  <TableCell><strong>Сумма</strong></TableCell>
                  <TableCell><strong>Описание</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.payment_date}</TableCell>
                    <TableCell>
                      <Typography 
                        sx={{ 
                          color: payment.amount > 0 ? 'success.main' : 'error.main',
                          fontWeight: 'bold'
                        }}
                      >
                        {payment.amount} ₽
                      </Typography>
                    </TableCell>
                    <TableCell>{payment.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Пополнение счета студента
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Сумма пополнения"
            type="number"
            fullWidth
            variant="outlined"
            value={paymentData.amount}
            onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Описание платежа"
            fullWidth
            variant="outlined"
            value={paymentData.description}
            onChange={(e) => setPaymentData({...paymentData, description: e.target.value})}
            sx={{ mb: 2 }}
            placeholder="Например: Оплата питания за январь"
          />
          <TextField
            margin="dense"
            label="Дата платежа"
            type="date"
            fullWidth
            variant="outlined"
            value={paymentData.payment_date}
            onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleAddPayment} variant="contained">
            Добавить платеж
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Главный компонент App
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    showNotification('Вход выполнен успешно', 'success');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showNotification('Выход выполнен', 'info');
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container component="main" maxWidth="lg">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
            <Typography variant="h6">Загрузка...</Typography>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {!user ? (
        <Login onLogin={handleLogin} onError={showNotification} />
      ) : (
        <UserDashboard 
          user={user} 
          onLogout={handleLogout} 
          onNotification={showNotification} 
        />
      )}

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
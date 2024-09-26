const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const bodyParser = require('body-parser');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const port = 3000;

const server = http.createServer(app);
const io = socketIO(server);

// EJS를 뷰 엔진으로 설정
app.set('view engine', 'ejs');

// MySQL 연결 설정
const cnn = mysql.createConnection({
    host: '192.168.0.102',
    user: 'test',
    password: '1234',
    database: 'data'
});

cnn.connect(err => {
    if (err) {
        console.error('MySQL 연결 실패:', err);
        setTimeout(() => handleDisconnect(), 2000); // 2초 후 재연결 시도
    } else {
        console.log('MySQL 연결 성공');
    }
});

function handleDisconnect() {
    cnn.connect(err => {
        if (err) {
            console.error('MySQL 연결 실패:', err);
            setTimeout(handleDisconnect, 2000); // 재연결
        }
    });
}



// 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: '1234',
    resave: false,
    saveUninitialized: true
}));

app.use(express.static('css')); // 정적 파일 허용
app.use(express.static('img')); 

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('A user connected');

    // 클라이언트에 초기 데이터 전송
    notifyClients();

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// 클라이언트에 데이터 전송
function notifyClients() {
    const sql = 'SELECT * FROM sensor_readins ORDER BY timestamp DESC LIMIT 1';
    cnn.query(sql, (err, result) => {
        if (err) {
            console.error('쿼리 실행 오류:', err);
            return;
        }
        if (result.length > 0) {
            const latestData = result[0];
            io.emit('update', { heartSensor: latestData.Heart_s }); // 클라이언트에 데이터 전송
        }
    });
}

// 1초마다 데이터베이스에서 데이터 조회
setInterval(notifyClients, 1000);

// 라우팅 설정
app.get('/', (req, res) => {
    res.render('main');   // ./views/main.ejs를 불러오기
});
app.get('/signup', (req, res) => {
    res.render('signup'); // ./views/signup.ejs를 불러오기
});
app.get('/test3', (req, res) => {
    res.render('test3'); // ./views/test3.ejs를 불러오기
});

app.post('/loginProc', (req, res) => {
    const user_id = req.body.user_id;
    const pw = req.body.pw;
    
    const sql = `SELECT * FROM member WHERE user_id=? AND pw=?`;
    const values = [user_id, pw];

    cnn.query(sql, values, (err, result) => {
        if (err) throw err;

        if (result.length === 0) {
            res.send("<script>alert('아이디 또는 비밀번호 오류'); location.href='/';</script>");
        } else {
            const user = result[0];
            req.session.userName = user.name;  // 세션에 사용자 이름 저장
            req.session.phone = user.phone;

            // 센서 데이터 쿼리
            const sensorSql = `SELECT * FROM sensor_readins`;
            cnn.query(sensorSql, (err, sensorResult) => {
                if (err) throw err;
                const sensor = sensorResult[sensorResult.length - 1];
                req.session.heartSensor = sensor.Heart_s;  // 마지막 센서 데이터 저장

                // 리다이렉트
                res.redirect('/index');
            });
        }
    });
});

app.post('/signUpProc', (req, res) => {
    const name = req.body.name;
    const user_id = req.body.user_id;
    const phone = req.body.phone;
    const pw = req.body.pw;

    // 먼저 user_id가 이미 존재하는지 확인
    const checkSql = `SELECT * FROM member WHERE user_id = ?`;
    cnn.query(checkSql, [user_id], (err, result) => {
        if (err) throw err;

        if (result.length > 0) {
            // user_id가 이미 존재하는 경우
            res.send("<script>alert('이미 있는 아이디입니다. 다른 아이디를 선택하세요.'); location.href='/signup';</script>");
        } else {
            // user_id가 존재하지 않는 경우, 회원가입 진행
            const insertSql = `INSERT INTO member (name, user_id, phone, pw) VALUES (?, ?, ?, ?)`;
            cnn.query(insertSql, [name, user_id, phone, pw], (err) => {
                if (err) throw err;

                res.send("<script>alert('회원가입이 완료 되었습니다!'); location.href='/';</script>");
            });
        }
    });
});

app.get('/index', (req, res) => {
    res.render('index', { 
        userName: req.session.userName, 
        heartSensor: req.session.heartSensor,
        phone: req.session.phone
    }); // 사용자 이름과 센서 데이터를 함께 전달
});

server.listen(port, () => {
    console.log(`서버 실행중. http://localhost:${port}`);
});

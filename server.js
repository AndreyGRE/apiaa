const express = require('express');
const multer  = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Папка для сохранения загруженных файлов
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Cors
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.post('/upload', upload.single('file'), async function (req, res, next) {
  const file = req.file;

  if (!file) {
    return res.status(400).send('Выберите файл');
  }

  const formData = new FormData();
  formData.append('instructions', JSON.stringify({
    parts: [
      {
        file: "file"
      }
    ]
  }));
  formData.append('file', fs.createReadStream(file.path));

  try {
    const response = await axios.post('https://api.pspdfkit.com/build', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': 'Bearer pdf_live_NVZodGpPjYMrwkibhY5dnZfIgKj5C3hw8XzLG0lwVvj'
      },
      responseType: "stream"
    });

    const pdfFilePath = path.join(__dirname, 'converted.pdf');
    const pdfWriteStream = fs.createWriteStream(pdfFilePath);
    response.data.pipe(pdfWriteStream);
    
    pdfWriteStream.on('finish', () => {
      fs.readFile(pdfFilePath, (err, data) => {
        if (err) {
          console.error('Произошла ошибка при чтении файла:', err);
          res.status(500).send('Произошла ошибка при чтении файла');
        } else {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
          res.send(data);
          // После отправки файла на фронтенд, рекомендуется удалить сгенерированный PDF-файл
          fs.unlinkSync(pdfFilePath);
          fs.unlinkSync(file.path);
        }
      });
    });
    
  } catch (error) {
    console.error('Произошла ошибка при конвертации в PDF:', error);
    res.status(500).send('Произошла ошибка при конвертации в PDF');
  }
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
const AppError = require('../errors/AppError');

function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

function tratadorDeErros(erro, req, res, next) {
  if (erro instanceof AppError) {
    const corpo = { erro: erro.message };
    if (erro.detalhes) corpo.detalhes = erro.detalhes;
    return res.status(erro.statusCode).json(corpo);
  }
  if (erro && erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  console.error(erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = { rotaNaoEncontrada, tratadorDeErros };

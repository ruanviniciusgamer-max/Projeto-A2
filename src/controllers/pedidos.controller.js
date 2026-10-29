const service = require('../services/pedidos.service');

module.exports = {
  criar(req, res, next) {
    try {
      res.status(201).json(service.criar(req.body));
    } catch (erro) {
      next(erro);
    }
  },
  listar(req, res, next) {
    try {
      res.status(200).json(service.listar());
    } catch (erro) {
      next(erro);
    }
  },
  buscarPorId(req, res, next) {
    try {
      res.status(200).json(service.buscarPorId(req.params.id));
    } catch (erro) {
      next(erro);
    }
  },
  atualizarStatus(req, res, next) {
    try {
      res.status(200).json(service.atualizarStatus(req.params.id, req.body));
    } catch (erro) {
      next(erro);
    }
  },
};

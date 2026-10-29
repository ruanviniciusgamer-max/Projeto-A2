const AppError = require('../errors/AppError');
const repository = require('../repositories/pedidos.repository');

const TIPOS = ['entrega', 'retirada', 'local'];
const PRIORIDADES = ['baixa', 'normal', 'alta'];
const STATUS = ['recebido', 'em_preparacao', 'enviado', 'entregue', 'cancelado'];

const TRANSICOES = {
  recebido: ['em_preparacao', 'cancelado'],
  em_preparacao: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: [],
};

function ehObjeto(corpo) {
  return corpo !== null && typeof corpo === 'object' && !Array.isArray(corpo);
}

function validarNovoPedido(corpo) {
  if (!ehObjeto(corpo)) {
    throw new AppError('O corpo da requisição deve ser um objeto JSON.', 400);
  }
  const erros = [];
  const { cliente, tipo, valor, prioridade } = corpo;

  if (typeof cliente !== 'string' || cliente.trim() === '') {
    erros.push('cliente é obrigatório e deve ser um texto não vazio.');
  }
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    erros.push('valor deve ser numérico e maior que zero.');
  }
  if (!TIPOS.includes(tipo)) {
    erros.push(`tipo inválido. Valores aceitos: ${TIPOS.join(', ')}.`);
  }
  if (!PRIORIDADES.includes(prioridade)) {
    erros.push(`prioridade inválida. Valores aceitos: ${PRIORIDADES.join(', ')}.`);
  }
  if (erros.length > 0) {
    throw new AppError('Dados inválidos.', 400, erros);
  }
  return { cliente: cliente.trim(), tipo, valor, prioridade };
}

function converterId(idTexto) {
  return /^[1-9]\d*$/.test(String(idTexto)) ? Number(idTexto) : null;
}

function naoEncontrado() {
  return new AppError('Pedido não encontrado.', 404);
}

module.exports = {
  TIPOS,
  PRIORIDADES,
  STATUS,
  TRANSICOES,

  criar(corpo) {
    const dados = validarNovoPedido(corpo);
    return repository.criar({ ...dados, status: 'recebido' });
  },

  listar() {
    return repository.listar();
  },

  buscarPorId(idTexto) {
    const id = converterId(idTexto);
    const pedido = id === null ? null : repository.buscarPorId(id);
    if (!pedido) throw naoEncontrado();
    return pedido;
  },

  atualizarStatus(idTexto, corpo) {
    const id = converterId(idTexto);
    const pedido = id === null ? null : repository.buscarPorId(id);
    if (!pedido) throw naoEncontrado();

    if (!ehObjeto(corpo) || typeof corpo.status !== 'string') {
      throw new AppError('Informe o campo "status" (texto) no corpo da requisição.', 400);
    }
    const novoStatus = corpo.status;
    if (!STATUS.includes(novoStatus)) {
      throw new AppError(`status inválido. Valores aceitos: ${STATUS.join(', ')}.`, 400);
    }
    if (!TRANSICOES[pedido.status].includes(novoStatus)) {
      const permitidos = TRANSICOES[pedido.status];
      throw new AppError(
        `Transição inválida: "${pedido.status}" -> "${novoStatus}". ` +
          (permitidos.length
            ? `Transições permitidas: ${permitidos.join(', ')}.`
            : 'Este pedido está em estado final.'),
        400
      );
    }
    return repository.atualizar(id, { status: novoStatus });
  },
};

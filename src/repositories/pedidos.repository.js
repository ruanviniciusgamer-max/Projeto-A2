let pedidos = [];
let proximoId = 1;

module.exports = {
  criar(dados) {
    const pedido = { id: proximoId++, ...dados };
    pedidos.push(pedido);
    return pedido;
  },
  listar() {
    return pedidos.map((p) => ({ ...p }));
  },
  buscarPorId(id) {
    const pedido = pedidos.find((p) => p.id === id);
    return pedido ? { ...pedido } : null;
  },
  atualizar(id, campos) {
    const indice = pedidos.findIndex((p) => p.id === id);
    if (indice === -1) return null;
    pedidos[indice] = { ...pedidos[indice], ...campos };
    return { ...pedidos[indice] };
  },
  limpar() {
    pedidos = [];
    proximoId = 1;
  },
};

const request = require('supertest');
const app = require('../src/app');
const repository = require('../src/repositories/pedidos.repository');

const valido = { cliente: 'Carlos Silva', tipo: 'entrega', valor: 350, prioridade: 'normal' };

beforeEach(() => repository.limpar());

describe('POST /pedidos', () => {
  test('cria pedido válido (201) com status recebido', async () => {
    const res = await request(app).post('/pedidos').send(valido);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, ...valido, status: 'recebido' });
  });

  test('remove espaços nas extremidades do cliente', async () => {
    const res = await request(app).post('/pedidos').send({ ...valido, cliente: '  Ana  ' });
    expect(res.status).toBe(201);
    expect(res.body.cliente).toBe('Ana');
  });

  test.each([
    ['cliente vazio', { cliente: '' }],
    ['cliente só com espaços', { cliente: '   ' }],
    ['cliente ausente', { cliente: undefined }],
    ['valor zero', { valor: 0 }],
    ['valor negativo', { valor: -5 }],
    ['valor texto', { valor: 'abc' }],
    ['valor numérico em string', { valor: '350' }],
    ['valor ausente', { valor: undefined }],
    ['tipo desconhecido', { tipo: 'teletransporte' }],
    ['prioridade desconhecida', { prioridade: 'urgentissima' }],
  ])('rejeita %s com 400 e mensagem JSON', async (_nome, alteracao) => {
    const res = await request(app).post('/pedidos').send({ ...valido, ...alteracao });
    expect(res.status).toBe(400);
    expect(res.body.erro).toBeDefined();
    expect(Array.isArray(res.body.detalhes)).toBe(true);
  });

  test('JSON malformado retorna 400', async () => {
    const res = await request(app)
      .post('/pedidos')
      .set('Content-Type', 'application/json')
      .send('{"cliente": ');
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/JSON/);
  });

  test('corpo não objeto retorna 400', async () => {
    const res = await request(app).post('/pedidos').send([1, 2]);
    expect(res.status).toBe(400);
  });
});

describe('GET /pedidos', () => {
  test('lista vazia retorna 200 e []', async () => {
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('lista pedidos cadastrados', async () => {
    await request(app).post('/pedidos').send(valido);
    await request(app).post('/pedidos').send({ ...valido, cliente: 'Maria' });
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /pedidos/:id', () => {
  test('retorna pedido existente (200)', async () => {
    await request(app).post('/pedidos').send(valido);
    const res = await request(app).get('/pedidos/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  test.each(['999', 'abc', '0', '-1', '1.5'])('id %s inexistente retorna 404', async (id) => {
    const res = await request(app).get(`/pedidos/${id}`);
    expect(res.status).toBe(404);
    expect(res.body.erro).toBeDefined();
  });
});

describe('PATCH /pedidos/:id/status', () => {
  beforeEach(async () => {
    await request(app).post('/pedidos').send(valido);
  });

  test('transição válida retorna 200', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'em_preparacao' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('em_preparacao');
  });

  test('fluxo completo até entregue', async () => {
    for (const status of ['em_preparacao', 'enviado', 'entregue']) {
      const res = await request(app).patch('/pedidos/1/status').send({ status });
      expect(res.status).toBe(200);
    }
  });

  test('cancelar a partir de recebido é permitido', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'cancelado' });
    expect(res.status).toBe(200);
  });

  test('status desconhecido retorna 400', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'voando' });
    expect(res.status).toBe(400);
  });

  test('corpo sem status retorna 400', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({});
    expect(res.status).toBe(400);
  });

  test('status não textual retorna 400', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({ status: 123 });
    expect(res.status).toBe(400);
  });

  test('transição inválida (pulo de etapa) retorna 400', async () => {
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'entregue' });
    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/Transição inválida/);
  });

  test('pedido cancelado não pode mudar de estado', async () => {
    await request(app).patch('/pedidos/1/status').send({ status: 'cancelado' });
    const res = await request(app).patch('/pedidos/1/status').send({ status: 'recebido' });
    expect(res.status).toBe(400);
  });

  test('ID inexistente retorna 404', async () => {
    const res = await request(app).patch('/pedidos/99/status').send({ status: 'cancelado' });
    expect(res.status).toBe(404);
  });

  test('404 tem prioridade sobre 400 quando id não existe e dados são inválidos', async () => {
    const res = await request(app).patch('/pedidos/99/status').send({});
    expect(res.status).toBe(404);
  });
});

describe('Outros', () => {
  test('rota desconhecida retorna 404 em JSON', async () => {
    const res = await request(app).get('/nada');
    expect(res.status).toBe(404);
    expect(res.body.erro).toBeDefined();
  });

  test('erro inesperado retorna 500 sem vazar detalhes', async () => {
    const spy = jest.spyOn(repository, 'listar').mockImplementation(() => {
      throw new Error('falha interna secreta');
    });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/secreta/);
    spy.mockRestore();
    errSpy.mockRestore();
  });
});

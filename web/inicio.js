import { $, api, MENSAJES } from './comun.js';
import { ponerIconos } from './iconos.js';

ponerIconos();

const p = new URLSearchParams(location.search);
if (p.get('enlace') === 'caducado') $('mensaje').textContent = 'Ese enlace ha caducado o se ha retirado. Pide un código nuevo.';
if (p.get('sin') === 'acceso') $('mensaje').textContent = MENSAJES.sin_acceso;

$('codigo').oninput = () => { $('codigo').value = $('codigo').value.replace(/\D/g, '').slice(0, 6); $('codigo').removeAttribute('aria-invalid'); };

$('form').onsubmit = async (e) => {
  e.preventDefault();
  $('mensaje').textContent = '';
  try {
    const { destino } = await api('/api/canjear', { metodo: 'POST', cuerpo: { codigo: $('codigo').value }, redirigir: false });
    location.href = destino;
  } catch (err) {
    $('mensaje').textContent = err.message;
    $('codigo').setAttribute('aria-invalid', 'true');
    $('codigo').select();
  }
};

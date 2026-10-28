# T1TSMetric — guia rápido

Créditos: https://github.com/nineflowersoflotus

Extraia o ZIP da release e abra **T1TSMetric.exe**. Para português, use **Options → Options → Language → Português**.

Escolha o disco e a pasta, clique em Analisar e revise os arquivos. Os resultados usam páginas de 120 itens; a seleção continua nas outras páginas. A remoção exige confirmação. Arquivos enviados à Lixeira só liberam espaço quando ela for esvaziada pelo Windows.

Clique na personagem para aplicar um impulso. O corpo se move e as molas secundárias continuam oscilando depois dele. Arraste para girar, role para aproximar e use ↑ / ↓ para mover o enquadramento. As opções reúnem cores, idioma, variação de volume, força das molas e limite de FPS.

## Enviar o projeto ao GitHub

1. Crie um repositório vazio na sua conta.
2. Extraia o ZIP do projeto e coloque estes arquivos na raiz do repositório, inclusive `.github`, `.gitignore` e `.gitattributes`.
3. Não envie `node_modules`, `dist` ou o executável para o código-fonte.
4. Envie os commits para `main`. O workflow de CI instala as dependências, executa os testes e compila a interface.
5. Para a release 1.3.0, envie a tag `v1.3.0`. O workflow gera um **rascunho** com o ZIP portátil e checksums. Revise os arquivos e publique o rascunho quando desejar.

Também é possível criar uma release manualmente no GitHub e anexar o ZIP portátil entregue junto deste projeto. O projeto foi preparado localmente; nenhum repositório ou release foi publicado por esta tarefa.

Para compilar localmente em Windows x64 com Node 24: `npm ci`, `npm test`, `npm run build`, `npm start`. Para criar o ZIP portátil: `npm run release`.

from django.contrib import admin
from .models import UnidadeMedida, CategoriaProduto, Produto, LocalEstoque, Estoque, MovimentoEstoque
admin.site.register([UnidadeMedida, CategoriaProduto, Produto, LocalEstoque, Estoque, MovimentoEstoque])

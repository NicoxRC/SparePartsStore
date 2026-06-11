import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Workbook } from 'exceljs';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';

const ARTICULOS_COLUMNS: { header: string; key: string }[] = [
  { header: 'REFERENCIA', key: 'referencia' },
  { header: 'CLASE', key: 'clase' },
  { header: 'BARRAS', key: 'barras' },
  { header: 'DESCRIPCION', key: 'descripcion' },
  { header: 'COSTO', key: 'costo' },
  { header: 'PRECIO', key: 'precio' },
  { header: 'PRECIO2', key: 'precio2' },
  { header: 'PRECIO3', key: 'precio3' },
  { header: 'PRECIO4', key: 'precio4' },
  { header: 'PRECIO5', key: 'precio5' },
  { header: 'DEPTO', key: 'depto' },
  { header: 'NOMBRE_DEPTO', key: 'nombreDepto' },
  { header: 'GRUPO', key: 'grupo' },
  { header: 'NOMBRE_GRUPO', key: 'nombreGrupo' },
  { header: 'LINEA', key: 'linea' },
  { header: 'NOMBRE_LINEA', key: 'nombreLinea' },
  { header: 'MARCA', key: 'marca' },
  { header: 'NOM_MARCA', key: 'nomMarca' },
  { header: 'TALLA', key: 'talla' },
  { header: 'IVA', key: 'iva' },
  { header: 'UND', key: 'und' },
  { header: 'DCTOMAX', key: 'dctomax' },
  { header: 'STOCKMIN', key: 'stockmin' },
  { header: 'STOCKMAX', key: 'stockmax' },
  { header: 'COLOR', key: 'color' },
  { header: 'PROVEEDOR', key: 'proveedor' },
  { header: 'CONTEO', key: 'conteo' },
  { header: 'UBICACION', key: 'ubicacion' },
  { header: 'CUM', key: 'cum' },
  { header: 'REGISTRO', key: 'registro' },
  { header: 'LOTE', key: 'lote' },
  { header: 'VENCIMIENTO', key: 'vencimiento' },
  { header: 'PRECIO_VARIABLE', key: 'precioVariable' },
];

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async generateArticulosWorkbook(): Promise<Buffer> {
    const products = await this.productsRepository
      .createQueryBuilder('product')
      .withDeleted()
      .leftJoinAndSelect('product.department', 'department')
      .leftJoinAndSelect('product.group', 'group')
      .leftJoinAndSelect('product.brand', 'brand')
      .where('product.deletedAt IS NULL')
      .orderBy('product.reference', 'ASC')
      .getMany();

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('ARTICULOS');
    worksheet.columns = ARTICULOS_COLUMNS;

    for (const product of products) {
      worksheet.addRow({
        referencia: product.reference,
        clase: '',
        barras: '',
        descripcion: product.description,
        costo: product.cost,
        precio: product.salePrice,
        precio2: '',
        precio3: '',
        precio4: '',
        precio5: '',
        depto: product.department.code,
        nombreDepto: product.department.name,
        grupo: product.group.code,
        nombreGrupo: product.group.name,
        linea: '',
        nombreLinea: '',
        marca: product.brand.code,
        nomMarca: product.brand.name,
        talla: '',
        iva: '',
        und: '',
        dctomax: '',
        stockmin: '',
        stockmax: '',
        color: '',
        proveedor: '',
        conteo: '',
        ubicacion: '',
        cum: '',
        registro: '',
        lote: '',
        vencimiento: '',
        precioVariable: '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

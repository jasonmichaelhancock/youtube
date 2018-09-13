import * as ts from 'typescript';
import { FileTransformerOptions } from '../types';
export default function generateMetadataFile({ metadata, outDir }?: FileTransformerOptions): ts.TransformerFactory<ts.SourceFile>;

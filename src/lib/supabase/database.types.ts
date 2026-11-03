
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "chamados": {
                  Row: {
                    "atualizado_em": string,"avaliacao_comentario": string | null,"avaliacao_nota": number | null,"avaliacao_token_hash": string | null,"categoria": Database["public"]['Enums']["categoria_chamado"],"criado_em": string,"descricao": string,"foto_path": string | null,"id": string,"imovel_id": string,"inquilino_id": string | null,"melhor_horario": string | null,"resolvido_em": string | null,"status": Database["public"]['Enums']["status_chamado"],"urgente": boolean,"valor": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"avaliacao_comentario"?: string | null,"avaliacao_nota"?: number | null,"avaliacao_token_hash"?: string | null,"categoria": Database["public"]['Enums']["categoria_chamado"],"criado_em"?: string,"descricao": string,"foto_path"?: string | null,"id"?: string,"imovel_id": string,"inquilino_id"?: string | null,"melhor_horario"?: string | null,"resolvido_em"?: string | null,"status"?: Database["public"]['Enums']["status_chamado"],"urgente"?: boolean,"valor"?: number | null
                  }
                  Update: {
                    "atualizado_em"?: string,"avaliacao_comentario"?: string | null,"avaliacao_nota"?: number | null,"avaliacao_token_hash"?: string | null,"categoria"?: Database["public"]['Enums']["categoria_chamado"],"criado_em"?: string,"descricao"?: string,"foto_path"?: string | null,"id"?: string,"imovel_id"?: string,"inquilino_id"?: string | null,"melhor_horario"?: string | null,"resolvido_em"?: string | null,"status"?: Database["public"]['Enums']["status_chamado"],"urgente"?: boolean,"valor"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "chamados_imovel_id_fkey"
      columns: ["imovel_id"]
isOneToOne: false
      referencedRelation: "imoveis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chamados_inquilino_id_imovel_id_fkey"
      columns: ["inquilino_id","imovel_id"]
isOneToOne: false
      referencedRelation: "inquilinos"
      referencedColumns: ["id","imovel_id"]
    }
                  ]
                },"eventos_chamado": {
                  Row: {
                    "autor": Database["public"]['Enums']["autor_evento"],"chamado_id": string,"criado_em": string,"id": string,"nota": string | null,"status_anterior": Database["public"]['Enums']["status_chamado"] | null,"status_novo": Database["public"]['Enums']["status_chamado"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "autor": Database["public"]['Enums']["autor_evento"],"chamado_id": string,"criado_em"?: string,"id"?: string,"nota"?: string | null,"status_anterior"?: Database["public"]['Enums']["status_chamado"] | null,"status_novo"?: Database["public"]['Enums']["status_chamado"] | null
                  }
                  Update: {
                    "autor"?: Database["public"]['Enums']["autor_evento"],"chamado_id"?: string,"criado_em"?: string,"id"?: string,"nota"?: string | null,"status_anterior"?: Database["public"]['Enums']["status_chamado"] | null,"status_novo"?: Database["public"]['Enums']["status_chamado"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "eventos_chamado_chamado_id_fkey"
      columns: ["chamado_id"]
isOneToOne: false
      referencedRelation: "chamados"
      referencedColumns: ["id"]
    }
                  ]
                },"imoveis": {
                  Row: {
                    "apelido": string,"arquivado_em": string | null,"atualizado_em": string,"bairro": string,"complemento": string | null,"criado_em": string,"dono_id": string,"foto_path": string | null,"id": string,"logradouro": string,"numero": string
                  }
                  ComputedFields: never
                  Insert: {
                    "apelido": string,"arquivado_em"?: string | null,"atualizado_em"?: string,"bairro": string,"complemento"?: string | null,"criado_em"?: string,"dono_id": string,"foto_path"?: string | null,"id"?: string,"logradouro": string,"numero": string
                  }
                  Update: {
                    "apelido"?: string,"arquivado_em"?: string | null,"atualizado_em"?: string,"bairro"?: string,"complemento"?: string | null,"criado_em"?: string,"dono_id"?: string,"foto_path"?: string | null,"id"?: string,"logradouro"?: string,"numero"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "imoveis_dono_id_fkey"
      columns: ["dono_id"]
isOneToOne: false
      referencedRelation: "proprietarios"
      referencedColumns: ["id"]
    }
                  ]
                },"inquilinos": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"criado_em": string,"email": string | null,"id": string,"imovel_id": string,"link_reenviado_em": string | null,"nome": string,"token_hash": string,"ultimo_acesso_em": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"email"?: string | null,"id"?: string,"imovel_id": string,"link_reenviado_em"?: string | null,"nome": string,"token_hash": string,"ultimo_acesso_em"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"email"?: string | null,"id"?: string,"imovel_id"?: string,"link_reenviado_em"?: string | null,"nome"?: string,"token_hash"?: string,"ultimo_acesso_em"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "inquilinos_imovel_id_fkey"
      columns: ["imovel_id"]
isOneToOne: false
      referencedRelation: "imoveis"
      referencedColumns: ["id"]
    }
                  ]
                },"notificacoes": {
                  Row: {
                    "chamado_id": string | null,"criado_em": string,"destino": Database["public"]['Enums']["destino_notificacao"],"entregar_em": string,"enviada": boolean,"enviada_em": string | null,"evento_id": string | null,"id": string,"inquilino_id": string | null,"proprietario_id": string | null,"reservada_ate": string | null,"tentativas": number,"tipo": string,"ultimo_erro": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "chamado_id"?: string | null,"criado_em"?: string,"destino": Database["public"]['Enums']["destino_notificacao"],"entregar_em"?: string,"enviada"?: boolean,"enviada_em"?: string | null,"evento_id"?: string | null,"id"?: string,"inquilino_id"?: string | null,"proprietario_id"?: string | null,"reservada_ate"?: string | null,"tentativas"?: number,"tipo": string,"ultimo_erro"?: string | null
                  }
                  Update: {
                    "chamado_id"?: string | null,"criado_em"?: string,"destino"?: Database["public"]['Enums']["destino_notificacao"],"entregar_em"?: string,"enviada"?: boolean,"enviada_em"?: string | null,"evento_id"?: string | null,"id"?: string,"inquilino_id"?: string | null,"proprietario_id"?: string | null,"reservada_ate"?: string | null,"tentativas"?: number,"tipo"?: string,"ultimo_erro"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notificacoes_chamado_id_fkey"
      columns: ["chamado_id"]
isOneToOne: false
      referencedRelation: "chamados"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notificacoes_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos_chamado"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notificacoes_inquilino_id_fkey"
      columns: ["inquilino_id"]
isOneToOne: false
      referencedRelation: "inquilinos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notificacoes_proprietario_id_fkey"
      columns: ["proprietario_id"]
isOneToOne: false
      referencedRelation: "proprietarios"
      referencedColumns: ["id"]
    }
                  ]
                },"proprietarios": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"id": string,"nome": string | null,"silencio_fim": string,"silencio_inicio": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"id": string,"nome"?: string | null,"silencio_fim"?: string,"silencio_inicio"?: string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"id"?: string,"nome"?: string | null,"silencio_fim"?: string,"silencio_inicio"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_inscricoes": {
                  Row: {
                    "auth": string,"criado_em": string,"endpoint": string,"id": string,"p256dh": string,"proprietario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"criado_em"?: string,"endpoint": string,"id"?: string,"p256dh": string,"proprietario_id": string
                  }
                  Update: {
                    "auth"?: string,"criado_em"?: string,"endpoint"?: string,"id"?: string,"p256dh"?: string,"proprietario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_inscricoes_proprietario_id_fkey"
      columns: ["proprietario_id"]
isOneToOne: false
      referencedRelation: "proprietarios"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "calcular_entrega":
{ Args: { "momento": string,"silencio_fim": string,"silencio_inicio": string,"urgente": boolean }; Returns: string
                           },
"chamar_entrega":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"excluir_ou_arquivar_imovel":
{ Args: { "imovel": string }; Returns: string
                           },
"mudar_status_chamado":
{ Args: { "chamado": string,"nota"?: string,"novo_status": Database["public"]['Enums']["status_chamado"],"valor"?: number }; Returns: undefined
                           },
"reservar_notificacoes":
{ Args: { "limite"?: number,"para": Database["public"]['Enums']["destino_notificacao"] }; Returns: {
              "chamado_id": string | null,
"criado_em": string,
"destino": Database["public"]['Enums']["destino_notificacao"],
"entregar_em": string,
"enviada": boolean,
"enviada_em": string | null,
"evento_id": string | null,
"id": string,
"inquilino_id": string | null,
"proprietario_id": string | null,
"reservada_ate": string | null,
"tentativas": number,
"tipo": string,
"ultimo_erro": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "notificacoes"
        isOneToOne: false
        isSetofReturn: true
      } }
          }
          Enums: {
            "autor_evento": "proprietario"|"inquilino"|"sistema","categoria_chamado": "hidraulica"|"eletrica"|"telhado"|"outros","destino_notificacao": "proprietario"|"inquilino","status_chamado": "aberto"|"em_andamento"|"resolvido"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "autor_evento": ["proprietario", "inquilino", "sistema"],"categoria_chamado": ["hidraulica", "eletrica", "telhado", "outros"],"destino_notificacao": ["proprietario", "inquilino"],"status_chamado": ["aberto", "em_andamento", "resolvido"]
          }
        }
} as const

/**
 * ==============================================================================
 * PROJETO JOVENS COM PROPÓSITO — JCP | BANCO DE DADOS & CAMADA DE BACKEND
 * ==============================================================================
 * Sistema relacional completo com controle de acesso (RBAC), auditoria global,
 * validação de permissões no backend/API e persistência em localStorage.
 * ==============================================================================
 */

const JCP_DB_KEY = 'jcp_system_db_v4'; // v4 = reset limpo (out/2026)
const JCP_SESSION_KEY = 'jcp_admin_session_v4';
const JCP_PARTICIPANT_SESSION_KEY = 'jcp_participant_session_v4';
const JCP_PENDING_PARTICIPANT_SIGNUP_KEY = 'jcp_participant_pending_signup_v1';

class DatabaseService {
    constructor() {
        this.supabase = this._createSupabaseClient();
        this.participantAuth = this._createParticipantAuthClient();
        this._currentAdmin = null;
        this._lastAdminAuthIssue = null;
        this._lastAdminAuthEmail = null;
        this._init();
    }

    _createSupabaseClient() {
        const config = window.JCP_SUPABASE_CONFIG;
        if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) return null;
        const isAdminPage = /(?:^|\/)admin\.html$/i.test(window.location.pathname);
        return window.supabase.createClient(config.url, config.publishableKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: isAdminPage }
        });
    }

    _createParticipantAuthClient() {
        const config = window.JCP_SUPABASE_CONFIG;
        if (!config?.url || !config?.publishableKey || !window.supabase?.createClient) return null;
        const isAdminPage = /(?:^|\/)admin\.html$/i.test(window.location.pathname);
        return window.supabase.createClient(config.url, config.publishableKey, {
            auth: {
                storageKey: 'jcp_participant_auth_v1',
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: !isAdminPage
            }
        });
    }

    _delay(ms = 60) {
        return new Promise(r => setTimeout(r, ms));
    }

    /* ==========================================================================
       INICIALIZAÇÃO & SEEDS DO BANCO DE DADOS
       ========================================================================== */
    _init() {
        if (!localStorage.getItem(JCP_DB_KEY)) {
            const seed = {
                // 1. PERFIS E PERMISSÕES (RBAC)
                roles: [
                    {
                        id: 'super_admin',
                        name: 'Super Admin',
                        description: 'Acesso irrestrito a todos os módulos, configurações, usuários e logs do sistema.',
                        permissions: ['*'],
                        isSystem: true
                    },
                    {
                        id: 'coordenador',
                        name: 'Coordenador',
                        description: 'Acesso a edições, ações, inscrições e voluntários. Sem acesso a logs e usuários.',
                        permissions: [
                            'dashboard:read',
                            'editions:read',
                            'editions:write',
                            'actions:read',
                            'actions:write',
                            'volunteers:read',
                            'volunteers:write',
                            'enrollments:read',
                            'enrollments:write',
                            'contributions:read',
                            'leaders:read',
                            'leaders:write',
                            'testimonials:read',
                            'testimonials:write'
                        ],
                        isSystem: true
                    },
                    {
                        id: 'midia',
                        name: 'Mídia',
                        description: 'Acesso exclusivo a fotos, vídeos, testemunhos, conteúdos editoriais (CMS) e consulta de edições.',
                        permissions: [
                            'dashboard:read',
                            'editions:read',
                            'media:read',
                            'media:write',
                            'testimonials:read',
                            'testimonials:write',
                            'content:read',
                            'content:write'
                        ],
                        isSystem: true
                    }
                ],

                // 2. ADMINISTRADORES
                admins: [
                ],

                // 3. EDIÇÕES
                editions: [
                    {
                        id: 'ed_1',
                        name: '2ª Edição — Qual é o Seu Propósito?',
                        type: 'Encontro', // 'Encontro' ou 'Ação Evangelística'
                        city: 'Pombal',
                        state: 'PB',
                        country: 'Brasil',
                        date: '10 a 12 de Outubro de 2026',
                        description: 'A segunda edição do JCP convoca toda a juventude cristã a discernir o seu chamado específico no Reino. Teremos oficinas ministeriais práticas de Louvor, Mídia, Ação Social e Missões no Sertão, vigílias e evangelismo.',
                        image: 'assets/images/noite_clamor.jpg',
                        status: 'Inscrições Abertas', // 'Planejamento', 'Inscrições Abertas', 'Inscrições Encerradas', 'Em Andamento', 'Finalizada', 'Cancelada'
                        registrationType: 'shirt', // 'none', 'free', 'paid', 'shirt'
                        price: 45.00,
                        shirtPrice: 45.00,
                        shirtSizes: ['PP', 'P', 'M', 'G', 'GG', 'XGG'],
                        createdAt: '2026-08-01T10:00:00Z',
                        updatedAt: '2026-09-30T14:00:00Z'
                    },
                    {
                        id: 'ed_2',
                        name: '13ª Edição – Dia com Deus',
                        type: 'Ação Evangelística',
                        city: 'Palmeira',
                        state: 'PB',
                        country: 'Brasil',
                        date: '31 de Outubro de 2026',
                        description: 'Cruzada de oração, evangelização ao ar livre, assistência humanitária e culto de celebração com as famílias sertanejas.',
                        image: 'assets/images/evangelismo_rua.jpg',
                        status: 'Inscrições Abertas',
                        registrationType: 'paid',
                        price: 25.00,
                        shirtPrice: 0,
                        shirtSizes: [],
                        createdAt: '2026-08-15T12:00:00Z',
                        updatedAt: '2026-09-30T14:00:00Z'
                    },
                    {
                        id: 'ed_4',
                        name: '12ª Edição – 2ª Viagem Missionária ao Paraguai',
                        type: 'Ação Evangelística',
                        city: 'San Lorenzo',
                        state: 'Central',
                        country: 'Paraguai',
                        date: 'Agosto de 2026',
                        description: 'Ação transcultural em apoio às comunidades e crianças paraguaias com apoio médico-social e bíblico.',
                        image: 'assets/images/sertao_mission.jpg',
                        status: 'Finalizada',
                        registrationType: 'none',
                        price: 0,
                        shirtPrice: 0,
                        shirtSizes: [],
                        createdAt: '2026-06-01T10:00:00Z',
                        updatedAt: '2026-08-25T18:00:00Z'
                    }
                ],

                // 4. AÇÕES VINCULADAS ÀS EDIÇÕES
                actions: [
                    {
                        id: 'act_1',
                        editionId: 'ed_1',
                        title: 'Vigília de Abertura & Quebrantamento',
                        date: '2026-10-10',
                        time: '22:00',
                        location: 'Tenda Central - Pombal',
                        leader: 'Pr. Marcos Dias',
                        description: 'Momento de clamor inicial com todos os participantes e líderes da região.',
                        status: 'Confirmada'
                    },
                    {
                        id: 'act_2',
                        editionId: 'ed_1',
                        title: 'Oficinas Vocacionais (Louvor, Mídia, Ação Social)',
                        date: '2026-10-11',
                        time: '14:00',
                        location: 'Escola Municipal de Pombal',
                        leader: 'José Samuel & Ana Silva',
                        description: 'Treinamento prático por ministérios com divisão de equipes em salas temáticas.',
                        status: 'Confirmada'
                    },
                    {
                        id: 'act_3',
                        editionId: 'ed_1',
                        title: 'Evangelismo de Impacto & Oração nas Ruas',
                        date: '2026-10-11',
                        time: '16:30',
                        location: 'Praça do Comércio e Ruas Centrais',
                        leader: 'Danilo Cândido',
                        description: 'Saída dos grupos para pregação face a face, distribuição de bíblias e oração por enfermos.',
                        status: 'Confirmada'
                    },
                    {
                        id: 'act_4',
                        editionId: 'ed_2',
                        title: 'Distribuição de Alimentos & Sopão Solidário',
                        date: '2026-10-31',
                        time: '11:00',
                        location: 'Comunidade Novo Horizonte - Palmeira',
                        leader: 'Equipe de Ação Social JCP',
                        description: 'Entrega de cestas básicas e atendimento às famílias carentes cadastradas.',
                        status: 'Confirmada'
                    }
                ],

                // 5. PARTICIPANTES & VOLUNTÁRIOS
                participants: [
                ],

                // 6. INSCRIÇÕES & COMPROVANTES
                enrollments: [
                ],

                // 7. CONTRIBUIÇÕES VOLUNTÁRIAS
                contributions: [
                ],

                // 8. CONFIGURAÇÕES GLOBAIS
                settings: {
                    pixKey: 'projetojovenscomproposito@gmail.com',
                    pixKeyType: 'E-mail',
                    pixBeneficiary: 'Projeto Jovens com Propósito',
                    pixBank: 'Banco do Brasil',
                    pixCity: 'Patos - PB',
                    pixNotice: 'Sua contribuição sustenta a realização dos encontros, viagens missionárias pelo sertão e o apoio a jovens e comunidades locais.',
                    contactEmail: 'projetojovenscomproposito@gmail.com',
                    contactPhone: '(83) 99999-9999',
                    instagram: '@jovenscomproposito',
                    churchPartnerCount: 14,
                    missionImpactLives: 450
                },

                // 9. AUDITORIA / LOGS
                logs: [
                ],

                // 10. CMS / CONTEÚDO EDITORIAL
                content: {
                    heroTitle: 'Existe vida no sertão da Paraíba.',
                    heroSubtitle: 'Uma comunidade de jovens conectada por valores, inspirando uma geração a viver de forma autêntica pelo Reino.',
                    aboutText: 'O Jovens com Propósito (JCP) nasceu para inspirar e equipar uma nova geração a viver com intencionalidade. Nossa visão é transformar o ordinário em extraordinário, guiados por princípios cristãos, comunhão genuína e serviço ao próximo.'
                },

                // 11. DEPARTAMENTOS
                departments: [
                              {
                                        "id": "dept_coord",
                                        "name": "Coordenação Geral",
                                        "description": "Supervisão ministerial, pastoreio e liderança geral do Projeto JCP.",
                                        "isActive": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              },
                              {
                                        "id": "dept_midia",
                                        "name": "Mídia & Comunicação",
                                        "description": "Produção audiovisual, cobertura de missões, fotografia e redes sociais.",
                                        "isActive": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              },
                              {
                                        "id": "dept_apoio",
                                        "name": "Equipe de Apoio",
                                        "description": "Suporte operacional, logística de acolhimento e estrutura das edições.",
                                        "isActive": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              },
                              {
                                        "id": "dept_fiscais",
                                        "name": "Equipe de Fiscais",
                                        "description": "Organização, ordem das atividades, fluxo e zelo pelos participantes.",
                                        "isActive": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              },
                              {
                                        "id": "dept_financeiro",
                                        "name": "Financeiro",
                                        "description": "Gestão de recursos, prestação de contas e transparência das contribuições.",
                                        "isActive": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              },
                              {
                                        "id": "dept_devocional",
                                        "name": "Devocional & Intercessão",
                                        "description": "Direção espiritual, momentos de oração, vigílias e edificação da fé.",
                                        "isActive": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              }
                    ],

                // 12. LÍDERES
                leaders: [
                              {
                                        "id": "leader_1",
                                        "fullName": "Pr. Dayrson",
                                        "departmentId": "dept_coord",
                                        "roleTitle": "Coordenador Geral",
                                        "biography": "Sirvo ao Senhor na coordenação geral do JCP, pastoreando corações e guiando esta geração no cumprimento da Grande Comissão no sertão.",
                                        "photoPath": "assets/images/leader_danilo.jpg",
                                        "instagramUrl": "",
                                        "displayOrder": 1,
                                        "isActive": true,
                                        "isPublished": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              },
                              {
                                        "id": "leader_2",
                                        "fullName": "Miss. Vânia",
                                        "departmentId": "dept_coord",
                                        "roleTitle": "Coordenadora Geral",
                                        "biography": "Dedico minha vida ao serviço missionário e ao pastoreio dos jovens no JCP, ensinando o amor de Cristo e o poder da oração e perseverança.",
                                        "photoPath": "",
                                        "instagramUrl": "",
                                        "displayOrder": 2,
                                        "isActive": true,
                                        "isPublished": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              },
                              {
                                        "id": "leader_3",
                                        "fullName": "Esther Késsia",
                                        "departmentId": "dept_midia",
                                        "roleTitle": "Liderança de Mídia",
                                        "biography": "Atuo na comunicação e mídia do JCP, compartilhando o evangelho através da criatividade e registrando o agir de Deus em cada edição.",
                                        "photoPath": "assets/images/leader_sarah.jpg",
                                        "instagramUrl": "@estherkessia",
                                        "displayOrder": 3,
                                        "isActive": true,
                                        "isPublished": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              },
                              {
                                        "id": "leader_4",
                                        "fullName": "Ezequiel Jonatas",
                                        "departmentId": "dept_midia",
                                        "roleTitle": "Liderança de Mídia & Audiovisual",
                                        "biography": "Uso as ferramentas audiovisuais para amplificar a mensagem do Reino e eternizar as memórias missionárias do Jovens com Propósito.",
                                        "photoPath": "assets/images/leader_joao.jpg",
                                        "instagramUrl": "@ezequieljonatass",
                                        "displayOrder": 4,
                                        "isActive": true,
                                        "isPublished": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              },
                              {
                                        "id": "leader_5",
                                        "fullName": "Pedro Lopes",
                                        "departmentId": "dept_apoio",
                                        "roleTitle": "Líder da Equipe de Apoio",
                                        "biography": "Lidero a equipe de apoio garantindo suporte operacional e zelo em cada detalhe, servindo aos irmãos com dedicação e espírito voluntário.",
                                        "photoPath": "",
                                        "instagramUrl": "@slpeedro",
                                        "displayOrder": 5,
                                        "isActive": true,
                                        "isPublished": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              },
                              {
                                        "id": "leader_6",
                                        "fullName": "Guilherme",
                                        "departmentId": "dept_fiscais",
                                        "roleTitle": "Líder da Equipe de Fiscais",
                                        "biography": "Sirvo coordenando a fiscalização e a ordem das atividades, zelando para que cada momento do projeto ocorra em paz, respeito e harmonia.",
                                        "photoPath": "",
                                        "instagramUrl": "@guilermi77",
                                        "displayOrder": 6,
                                        "isActive": true,
                                        "isPublished": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              },
                              {
                                        "id": "leader_7",
                                        "fullName": "Kelyane Moura",
                                        "departmentId": "dept_fiscais",
                                        "roleTitle": "Líder da Equipe de Fiscais",
                                        "biography": "Atuo na coordenação dos fiscais com cuidado, carinho e firmeza, zelando pelo bem-estar e organização de todos os participantes.",
                                        "photoPath": "",
                                        "instagramUrl": "@kelyane_moura",
                                        "displayOrder": 7,
                                        "isActive": true,
                                        "isPublished": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              },
                              {
                                        "id": "leader_8",
                                        "fullName": "Gilmara Bandeira",
                                        "departmentId": "dept_financeiro",
                                        "roleTitle": "Gestão Financeira",
                                        "biography": "Administro os recursos do JCP com integridade, transparência e responsabilidade, para que cada oferta frutifique na obra de Deus.",
                                        "photoPath": "",
                                        "instagramUrl": "@jubandeirasjp",
                                        "displayOrder": 8,
                                        "isActive": true,
                                        "isPublished": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              },
                              {
                                        "id": "leader_9",
                                        "fullName": "Leticia Rodrigues",
                                        "departmentId": "dept_devocional",
                                        "roleTitle": "Dirigente do Devocional",
                                        "biography": "Conduzo os momentos de devocional e busca pelo Espírito Santo, edificando a fé dos jovens e cultivando uma intimidade viva com o Pai.",
                                        "photoPath": "",
                                        "instagramUrl": "@lericiarovieira",
                                        "displayOrder": 9,
                                        "isActive": true,
                                        "isPublished": true,
                                        "createdAt": "2026-01-10T10:00:00Z",
                                        "updatedAt": "2026-01-10T10:00:00Z"
                              }
                    ]
            };
            this._save(seed);
        }

        // ==========================================================================
        // RESET CANÔNICO v4 — Garante dados oficiais em QUALQUER estado do banco
        // ==========================================================================
        const existing = this._read();
        let needsSave = false;

        // Remove credentials left by older local seeds without dropping admin data.
        if (Array.isArray(existing.admins)) {
            let removedLegacyPasswords = false;
            existing.admins = existing.admins.map(admin => {
                if (!admin || typeof admin !== 'object' || !Object.prototype.hasOwnProperty.call(admin, 'password')) {
                    return admin;
                }
                const sanitizedAdmin = { ...admin };
                delete sanitizedAdmin.password;
                removedLegacyPasswords = true;
                return sanitizedAdmin;
            });
            if (removedLegacyPasswords) needsSave = true;
        }

        // --- Departamentos oficiais (sobrescreve sempre) ---
        const canonicalDepartments = [
            { id: 'dept_coord',      name: 'Coordenação Geral',      description: 'Supervisão ministerial, pastoreio e liderança geral do Projeto JCP.',                                isActive: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
            { id: 'dept_midia',      name: 'Mídia & Comunicação',     description: 'Produção audiovisual, cobertura de missões, fotografia e redes sociais.',                          isActive: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
            { id: 'dept_apoio',      name: 'Equipe de Apoio',         description: 'Suporte operacional, logística de acolhimento e estrutura das edições.',                           isActive: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
            { id: 'dept_fiscais',    name: 'Equipe de Fiscais',       description: 'Organização, ordem das atividades, fluxo e zelo pelos participantes.',                             isActive: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
            { id: 'dept_financeiro', name: 'Financeiro',              description: 'Gestão de recursos, prestação de contas e transparência das contribuições.',                        isActive: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
            { id: 'dept_devocional', name: 'Devocional & Intercessão',description: 'Direção espiritual, momentos de oração, vigílias e edificação da fé.',                            isActive: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' }
        ];
        existing.departments = canonicalDepartments;
        needsSave = true;

        // --- Líderes oficiais (sobrescreve sempre) ---
        const canonicalLeaders = [
            { id: 'leader_1', fullName: 'Pr. Dayrson',       departmentId: 'dept_coord',      roleTitle: 'Coordenador Geral',              biography: 'Sirvo ao Senhor na coordenação geral do JCP, pastoreando corações e guiando esta geração no cumprimento da Grande Comissão no sertão.',                                         photoPath: 'assets/images/leader_danilo.jpg', instagramUrl: '',               displayOrder: 1, isActive: true, isPublished: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
            { id: 'leader_2', fullName: 'Miss. Vânia',       departmentId: 'dept_coord',      roleTitle: 'Coordenadora Geral',             biography: 'Dedico minha vida ao serviço missionário e ao pastoreio dos jovens no JCP, ensinando o amor de Cristo e o poder da oração e perseverança.',                                   photoPath: '',                               instagramUrl: '',               displayOrder: 2, isActive: true, isPublished: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
            { id: 'leader_3', fullName: 'Esther Késsia',     departmentId: 'dept_midia',      roleTitle: 'Liderança de Mídia',             biography: 'Atuo na comunicação e mídia do JCP, compartilhando o evangelho através da criatividade e registrando o agir de Deus em cada edição.',                                         photoPath: 'assets/images/leader_sarah.jpg', instagramUrl: '@estherkessia',  displayOrder: 3, isActive: true, isPublished: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
            { id: 'leader_4', fullName: 'Ezequiel Jonatas',  departmentId: 'dept_midia',      roleTitle: 'Liderança de Mídia & Audiovisual',biography: 'Uso as ferramentas audiovisuais para amplificar a mensagem do Reino e eternizar as memórias missionárias do Jovens com Propósito.',                                       photoPath: 'assets/images/leader_joao.jpg',  instagramUrl: '@ezequieljonatass', displayOrder: 4, isActive: true, isPublished: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
            { id: 'leader_5', fullName: 'Pedro Lopes',       departmentId: 'dept_apoio',      roleTitle: 'Líder da Equipe de Apoio',       biography: 'Lidero a equipe de apoio garantindo suporte operacional e zelo em cada detalhe, servindo aos irmãos com dedicação e espírito voluntário.',                                    photoPath: '',                               instagramUrl: '@slpeedro',      displayOrder: 5, isActive: true, isPublished: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
            { id: 'leader_6', fullName: 'Guilherme',         departmentId: 'dept_fiscais',    roleTitle: 'Líder da Equipe de Fiscais',     biography: 'Sirvo coordenando a fiscalização e a ordem das atividades, zelando para que cada momento do projeto ocorra em paz, respeito e harmonia.',                                  photoPath: '',                               instagramUrl: '@guilermi77',     displayOrder: 6, isActive: true, isPublished: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
            { id: 'leader_7', fullName: 'Kelyane Moura',     departmentId: 'dept_fiscais',    roleTitle: 'Líder da Equipe de Fiscais',     biography: 'Atuo na coordenação dos fiscais com cuidado, carinho e firmeza, zelando pelo bem-estar e organização de todos os participantes.',                                         photoPath: '',                               instagramUrl: '@kelyane_moura', displayOrder: 7, isActive: true, isPublished: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
            { id: 'leader_8', fullName: 'Gilmara Bandeira',  departmentId: 'dept_financeiro', roleTitle: 'Gestão Financeira',              biography: 'Administro os recursos do JCP com integridade, transparência e responsabilidade, para que cada oferta frutifique na obra de Deus.',                                       photoPath: '',                               instagramUrl: '@jubandeirasjp', displayOrder: 8, isActive: true, isPublished: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
            { id: 'leader_9', fullName: 'Leticia Rodrigues', departmentId: 'dept_devocional', roleTitle: 'Dirigente do Devocional',        biography: 'Conduzo os momentos de devocional e busca pelo Espírito Santo, edificando a fé dos jovens e cultivando uma intimidade viva com o Pai.',                                   photoPath: '',                               instagramUrl: '@lericiarovieira',displayOrder: 9, isActive: true, isPublished: true, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' }
        ];
        existing.leaders = canonicalLeaders;

        // --- Edições: remove ed_3 e garante apenas as 3 oficiais ---
        if (existing.editions) {
            existing.editions = existing.editions.filter(e => e.id !== 'ed_3');
        }

        // --- Permissões do coordenador e mídia ---
        if (existing.roles) {
            const coordRole = existing.roles.find(r => r.id === 'coordenador');
            if (coordRole && !coordRole.permissions.includes('leaders:read')) {
                coordRole.permissions.push('leaders:read', 'leaders:write');
                needsSave = true;
            }
            if (coordRole && !coordRole.permissions.includes('testimonials:read')) {
                coordRole.permissions.push('testimonials:read', 'testimonials:write');
                needsSave = true;
            }
            const midiaRole = existing.roles.find(r => r.id === 'midia');
            if (midiaRole && !midiaRole.permissions.includes('testimonials:read')) {
                midiaRole.permissions.push('testimonials:read', 'testimonials:write');
                needsSave = true;
            }
        }

        if (existing.editions && existing.editions.some(e => e.id === 'ed_3')) {
            existing.editions = existing.editions.filter(e => e.id !== 'ed_3');
            needsSave = true;
        }

        if (!Array.isArray(existing.media)) {
            existing.media = [
                { id: 'media_seed_1', title: 'Noite de Clamor', src: 'assets/images/noite_clamor.jpg', alt: 'Vigília de oração', createdAt: '2026-09-01T00:00:00.000Z' },
                { id: 'media_seed_2', title: 'Roda de Oração', src: 'assets/images/comunhao_roda.jpg', alt: 'Jovens em comunhão e oração', createdAt: '2026-09-02T00:00:00.000Z' },
                { id: 'media_seed_3', title: 'Evangelismo de Rua', src: 'assets/images/evangelismo_rua.jpg', alt: 'Ação de evangelismo de rua', createdAt: '2026-09-03T00:00:00.000Z' },
                { id: 'media_seed_4', title: 'Louvor e Adoração', src: 'assets/images/hero_worship.jpg', alt: 'Momento de louvor', createdAt: '2026-09-04T00:00:00.000Z' },
                { id: 'media_seed_5', title: 'Missão Sertaneja', src: 'assets/images/sertao_mission.jpg', alt: 'Equipe em missão no sertão', createdAt: '2026-09-05T00:00:00.000Z' }
            ];
            needsSave = true;
        }

        if (!Array.isArray(existing.testimonials)) {
            existing.testimonials = [];
            needsSave = true;
        }

        if (needsSave) this._save(existing);

        // Se não houver administrador logado no session, seta padrão Super Admin
        if (!sessionStorage.getItem(JCP_SESSION_KEY) && !localStorage.getItem(JCP_SESSION_KEY)) {
            const db = this._read();
            const defaultAdmin = db.admins.find(a => a.roleId === 'super_admin') || db.admins[0];
            if (defaultAdmin) {
                const sessionData = {
                    id: defaultAdmin.id,
                    name: defaultAdmin.name,
                    email: defaultAdmin.email,
                    roleId: defaultAdmin.roleId,
                    avatar: defaultAdmin.avatar
                };
                sessionStorage.setItem(JCP_SESSION_KEY, JSON.stringify(sessionData));
            }
        }
    }

    _read() {
        try {
            return JSON.parse(localStorage.getItem(JCP_DB_KEY)) || {};
        } catch (e) {
            console.error('Erro ao ler DB:', e);
            return {};
        }
    }

    _hasRemoteDataSource() {
        return Boolean(this.supabase && window.JCP_SUPABASE_CONFIG?.url);
    }

    async _selectRemoteRows(table) {
        if (!this._hasRemoteDataSource()) return null;
        const { data, error } = await this.supabase.from(table).select('*');
        if (error) {
            const message = error.code === '42501'
                ? 'Acesso negado pelas políticas RLS.'
                : (error.message || 'Erro de consulta.');
            throw new Error(`Não foi possível carregar public.${table}: ${message}`);
        }
        return Array.isArray(data) ? data : [];
    }

    _mapRemoteEdition(row) {
        return {
            id: row.id,
            name: row.name || '',
            type: row.type || 'Encontro',
            city: row.city || '',
            state: row.state || '',
            country: row.country || 'Brasil',
            date: row.date || '',
            description: row.description || '',
            image: row.image || '',
            status: row.status || '',
            registrationType: row.registration_type || 'free',
            price: Number(row.price || 0),
            shirtPrice: Number(row.shirt_price || 0),
            shirtSizes: Array.isArray(row.shirt_sizes) ? row.shirt_sizes : [],
            createdAt: row.created_at || '',
            updatedAt: row.updated_at || ''
        };
    }

    _mapRemoteParticipant(row) {
        return {
            id: row.id,
            name: row.name || '',
            birthDate: row.birth_date || '',
            phone: row.phone || '',
            email: row.email || '',
            address: {
                city: row.city || '',
                state: row.state || '',
                street: row.street || '',
                neighborhood: row.neighborhood || ''
            },
            pastor: row.pastor || '',
            church: row.church || '',
            isVolunteer: Boolean(row.is_volunteer),
            volunteerAreas: Array.isArray(row.volunteer_areas) ? row.volunteer_areas : [],
            volunteerOtherDetails: row.volunteer_other_details || '',
            status: row.status || 'Ativo',
            createdAt: row.created_at || '',
            updatedAt: row.updated_at || ''
        };
    }

    _mapRemoteEnrollment(row, participant = null, edition = null) {
        return {
            id: row.id,
            editionId: row.edition_id || '',
            participantId: row.participant_id || '',
            participantName: row.participant_name || participant?.name || '',
            participantPhone: row.participant_phone || participant?.phone || '',
            participantEmail: row.participant_email || participant?.email || '',
            editionName: row.edition_name || edition?.name || '',
            registrationType: row.registration_type || edition?.registrationType || '',
            shirtSize: row.shirt_size || '',
            amount: Number(row.amount_paid ?? row.amount ?? 0),
            status: row.status || 'Pendente',
            paymentStatus: row.payment_status || (row.proof_url ? 'Comprovante Enviado' : 'Pendente'),
            proofFile: row.proof_url || '',
            proofFileName: row.proof_file_name || '',
            adminNotes: row.admin_notes || '',
            createdAt: row.created_at || '',
            updatedAt: row.updated_at || '',
            participant,
            edition
        };
    }

    _mapRemoteContribution(row) {
        return {
            id: row.id,
            donorName: row.donor_name || 'Doador Anônimo',
            email: row.donor_email || '',
            phone: row.donor_phone || '',
            amount: Number(row.amount || 0),
            intent: row.intent || '',
            notes: row.intent || '',
            date: row.created_at || '',
            createdAt: row.created_at || '',
            paymentMethod: row.payment_method || 'PIX',
            proofFile: row.proof_url || '',
            proofFileName: row.proof_file_name || '',
            status: row.status || ''
        };
    }

    _save(data) {
        try {
            localStorage.setItem(JCP_DB_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Falha ao salvar no localStorage (possivel limite de quota):', e);
            if (data.logs && data.logs.length > 20) {
                data.logs = data.logs.slice(0, 20);
                try {
                    localStorage.setItem(JCP_DB_KEY, JSON.stringify(data));
                    return;
                } catch (e2) {
                    console.error('Segunda tentativa de salvar falhou:', e2);
                }
            }
            throw new Error('Limite de armazenamento do navegador atingido. A imagem enviada ou os dados excederam o espaco local.');
        }
    }

    /* ==========================================================================
       SEGURANÇA & VALIDAÇÃO DE PERMISSÕES NO BACKEND/API
       ========================================================================== */
    async getCurrentAdmin() {
        if (!this.supabase) {
            this._lastAdminAuthIssue = 'supabase_not_configured';
            return null;
        }
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error || !user) {
                this._currentAdmin = null;
                this._lastAdminAuthEmail = null;
                this._lastAdminAuthIssue = error ? 'auth_verification_failed' : 'unauthenticated';
                return null;
            }
            this._lastAdminAuthEmail = user.email || null;
            const { data: profiles, error: profileError } = await this.supabase.rpc('jcp_get_current_admin_profile');
            if (profileError) {
                this._currentAdmin = null;
                this._lastAdminAuthIssue = 'profile_query_failed';
                console.error('[JCP Auth] Admin profile query failed:', profileError.code || profileError.name || 'unknown');
                return null;
            }
            const profile = Array.isArray(profiles) ? profiles[0] : null;
            if (!profile) {
                this._currentAdmin = null;
                this._lastAdminAuthIssue = 'profile_missing';
                return null;
            }
            if (profile.status !== 'Ativo') {
                this._currentAdmin = null;
                this._lastAdminAuthIssue = 'profile_inactive';
                return null;
            }
            this._currentAdmin = {
                id: user.id,
                name: profile.display_name,
                email: user.email,
                roleId: profile.role_id,
                avatar: profile.avatar || (profile.display_name || '').substring(0, 2).toUpperCase()
            };
            this._lastAdminAuthIssue = null;
            return this._currentAdmin;
        } catch (error) {
            this._currentAdmin = null;
            this._lastAdminAuthIssue = 'profile_check_failed';
            console.error('[JCP Auth] Admin profile check failed:', error?.name || 'unknown');
            return null;
        }
    }

    async getAdminRole(roleId) {
        const db = this._read();
        return db.roles.find(r => r.id === roleId) || null;
    }

    async hasPermission(permission) {
        if (!this.supabase || !(await this.getCurrentAdmin())) return false;
        const { data, error } = await this.supabase.rpc('jcp_has_permission', {
            requested_permission: permission
        });
        if (!error && data === true) return true;
        if (permission === 'testimonials:read') {
            return (await this.hasPermission('media:read')) || (await this.hasPermission('leaders:read'));
        }
        if (permission === 'testimonials:write') {
            return (await this.hasPermission('media:write')) || (await this.hasPermission('leaders:write'));
        }
        return false;
    }

    async _requirePermission(permission) {
        const ok = await this.hasPermission(permission);
        if (!ok) {
            const admin = await this.getCurrentAdmin();
            const roleName = admin ? admin.roleId : 'Não autenticado';
            throw new Error(`Acesso negado: Perfil "${roleName}" não possui permissão para "${permission}".`);
        }
    }

    async loginAdmin(email, password) {
        if (!this.supabase) throw new Error('Autenticação segura indisponível: configure o projeto Supabase.');
        const { error } = await this.supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(), password
        });
        if (error) {
            if (error.code === 'email_not_confirmed') {
                throw new Error('Confirme o endereço de e-mail pelo convite do Supabase antes de entrar.');
            }
            if (error.name === 'AuthRetryableFetchError' || !error.status) {
                throw new Error('Não foi possível conectar ao Supabase. Verifique a conexão e tente novamente.');
            }
            throw new Error('E-mail ou senha inválidos.');
        }
        const admin = await this.getCurrentAdmin();
        if (!admin) {
            await this.supabase.auth.signOut();
            const messages = {
                profile_query_failed: 'O login foi aceito, mas não foi possível consultar o perfil. Verifique a migração e as políticas RLS.',
                profile_missing: `O login foi aceito, mas não existe perfil administrativo vinculado à conta ${this._lastAdminAuthEmail || 'autenticada'}. Confira se esse é o e-mail provisionado e se o vínculo foi feito no mesmo projeto Supabase.`,
                profile_inactive: 'A conta administrativa está inativa. Ative o perfil no banco antes de entrar.',
                auth_verification_failed: 'O Supabase não conseguiu validar a sessão. Tente entrar novamente.'
            };
            throw new Error(messages[this._lastAdminAuthIssue] || 'Conta sem perfil administrativo ativo.');
        }
        return admin;
    }

    async logoutAdmin() {
        this._currentAdmin = null;
        if (this.supabase) await this.supabase.auth.signOut();
        sessionStorage.removeItem(JCP_SESSION_KEY);
        localStorage.removeItem(JCP_SESSION_KEY);
    }

    async loginParticipant(email, password) {
        if (!this.participantAuth) throw new Error('Autenticacao indisponivel: configure o Supabase.');
        const { data, error } = await this.participantAuth.auth.signInWithPassword({ email, password });
        if (error || !data?.user?.email) {
            if (error?.name === 'AuthRetryableFetchError' || !error?.status) {
                throw new Error('Nao foi possivel conectar ao servico de autenticacao. Tente novamente.');
            }
            throw new Error('E-mail ou senha incorretos. Se ainda nao criou a conta, use Novo Cadastro.');
        }
        return data.user;
    }

    async createParticipantAccount(email, password) {
        if (!this.participantAuth) throw new Error('Autenticacao indisponivel: configure o Supabase.');
        const redirectTo = `${window.location.origin}${window.location.pathname}`;
        const { data, error } = await this.participantAuth.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectTo }
        });
        if (error) {
            if (error.name === 'AuthRetryableFetchError' || !error.status) {
                throw new Error('Nao foi possivel conectar ao servico de autenticacao. Tente novamente.');
            }
            if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
                throw new Error('Limite de e-mails de confirmacao atingido. Aguarde antes de tentar novamente.');
            }
            throw new Error('Nao foi possivel criar a conta. Confira o e-mail e tente novamente.');
        }

        if (data?.session) return { user: data.user, session: data.session };

        // An already-confirmed account can complete a participant profile from
        // the registration form after authenticating with its existing password.
        const existingLogin = await this.participantAuth.auth.signInWithPassword({ email, password });
        if (existingLogin.data?.session && existingLogin.data?.user?.email) {
            return { user: existingLogin.data.user, session: existingLogin.data.session };
        }

        if (Array.isArray(data?.user?.identities) && data.user.identities.length === 0) {
            throw new Error('Já existe uma conta com este e-mail. Entre pela aba Já sou cadastrado usando a senha da conta.');
        }
        return { user: data?.user || null, session: null, requiresEmailConfirmation: true };
    }

    async requestParticipantPasswordReset(email) {
        if (!this.participantAuth) throw new Error('Autenticacao indisponivel: configure o Supabase.');
        const redirectTo = `${window.location.origin}${window.location.pathname}?participantRecovery=1`;
        const { error } = await this.participantAuth.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) {
            if (error.status === 429) throw new Error('Limite de solicitações atingido. Aguarde e tente novamente.');
            throw new Error('Nao foi possivel solicitar a redefinicao de senha. Tente novamente.');
        }
    }

    async updateParticipantPassword(password) {
        if (!this.participantAuth) throw new Error('Autenticacao indisponivel: configure o Supabase.');
        const { data, error } = await this.participantAuth.auth.updateUser({ password });
        if (error || !data?.user) throw new Error('Nao foi possivel salvar a nova senha. Solicite outro link de recuperacao.');
        return data.user;
    }

    setPendingParticipantSignup(participant) {
        if (!participant?.email) throw new Error('Cadastro pendente sem e-mail.');
        localStorage.setItem(JCP_PENDING_PARTICIPANT_SIGNUP_KEY, JSON.stringify({
            participant,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000
        }));
    }

    getPendingParticipantSignup() {
        const raw = localStorage.getItem(JCP_PENDING_PARTICIPANT_SIGNUP_KEY);
        if (!raw) return null;
        try {
            const saved = JSON.parse(raw);
            if (!saved?.participant || saved.expiresAt < Date.now()) {
                localStorage.removeItem(JCP_PENDING_PARTICIPANT_SIGNUP_KEY);
                return null;
            }
            return saved.participant;
        } catch {
            localStorage.removeItem(JCP_PENDING_PARTICIPANT_SIGNUP_KEY);
            return null;
        }
    }

    async completePendingParticipantSignup() {
        const participantData = this.getPendingParticipantSignup();
        if (!participantData) return null;
        if (!this.participantAuth) throw new Error('Autenticacao indisponivel: configure o Supabase.');
        const { data, error } = await this.participantAuth.auth.getSession();
        const authEmail = data?.session?.user?.email;
        if (error || !authEmail) return null;
        if (this._normalizeParticipantEmail(authEmail) !== this._normalizeParticipantEmail(participantData.email)) {
            throw new Error('O e-mail autenticado nao corresponde ao cadastro pendente.');
        }

        const existingByPhone = await this.getParticipantByPhone(participantData.phone);
        if (existingByPhone && this._normalizeParticipantEmail(existingByPhone.email) !== this._normalizeParticipantEmail(authEmail)) {
            throw new Error('Este telefone ja esta vinculado a outro e-mail. Fale com a coordenacao para atualizar o cadastro.');
        }
        const participant = await this.registerParticipant(participantData);
        localStorage.removeItem(JCP_PENDING_PARTICIPANT_SIGNUP_KEY);
        return participant;
    }

    async logoutParticipant() {
        this.setCurrentParticipant(null);
        if (this.participantAuth) await this.participantAuth.auth.signOut();
    }

    async restoreParticipantSession() {
        const participant = this.getCurrentParticipant();
        if (!this.participantAuth) {
            this.setCurrentParticipant(null);
            return null;
        }

        const { data, error } = await this.participantAuth.auth.getSession();
        const authEmail = data?.session?.user?.email;
        if (!participant) {
            const pending = this.getPendingParticipantSignup();
            const isPasswordRecovery = new URLSearchParams(window.location.search).get('participantRecovery') === '1';
            const isPendingSignup = pending && this._normalizeParticipantEmail(authEmail) === this._normalizeParticipantEmail(pending.email);
            if (authEmail && !isPasswordRecovery && !isPendingSignup) {
                await this.participantAuth.auth.signOut();
            }
            return null;
        }
        if (error || !authEmail || this._normalizeParticipantEmail(authEmail) !== this._normalizeParticipantEmail(participant.email)) {
            this.setCurrentParticipant(null);
            if (authEmail) await this.participantAuth.auth.signOut();
            return null;
        }
        return participant;
    }

    /* ==========================================================================
       AUDITORIA & LOGS GLOBAIS
       ========================================================================== */
    async addAuditLog(action, affectedRecord, details = '') {
        const db = this._read();
        const currentAdmin = await this.getCurrentAdmin();
        const currentParticipant = this.getCurrentParticipant();

        let userId = 'SISTEMA';
        let userName = 'Sistema';
        let userRole = 'Sistema';

        if (currentAdmin) {
            userId = currentAdmin.id;
            userName = currentAdmin.name;
            userRole = currentAdmin.roleId === 'super_admin' ? 'Super Admin' : (currentAdmin.roleId === 'coordenador' ? 'Coordenador' : 'Mídia');
        } else if (currentParticipant) {
            userId = currentParticipant.id;
            userName = currentParticipant.name;
            userRole = currentParticipant.isVolunteer ? 'Voluntário' : 'Participante';
        }

        const now = new Date();
        const logItem = {
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp: now.toISOString(),
            formattedDate: now.toLocaleDateString('pt-BR'),
            formattedTime: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            userId,
            userName,
            userRole,
            action,
            affectedRecord: affectedRecord || 'Sistema',
            ip: '127.0.0.1',
            details: typeof details === 'object' ? JSON.stringify(details) : String(details)
        };

        db.logs = db.logs || [];
        db.logs.unshift(logItem);

        // Limita a 500 logs para evitar estouro de memória
        if (db.logs.length > 500) {
            db.logs = db.logs.slice(0, 500);
        }

        this._save(db);
        return logItem;
    }

    async getLogs(filter = {}) {
        await this._delay();
        await this._requirePermission('logs:read');
        const db = this._read();
        let logs = db.logs || [];

        if (filter.action) {
            logs = logs.filter(l => l.action.toLowerCase().includes(filter.action.toLowerCase()));
        }
        if (filter.search) {
            const s = filter.search.toLowerCase();
            logs = logs.filter(l =>
                l.userName.toLowerCase().includes(s) ||
                l.action.toLowerCase().includes(s) ||
                l.affectedRecord.toLowerCase().includes(s) ||
                (l.details && l.details.toLowerCase().includes(s))
            );
        }
        return logs;
    }

    /* ==========================================================================
       1. EDIÇÕES (CRUD COMPLETO)
       ========================================================================== */
    async getEditions(filter = {}) {
        await this._delay();
        const remoteRows = await this._selectRemoteRows('editions');
        let editions = remoteRows === null
            ? (this._read().editions || [])
            : remoteRows.map(row => this._mapRemoteEdition(row));

        if (filter.status) {
            editions = editions.filter(e => e.status === filter.status);
        }
        if (filter.type) {
            editions = editions.filter(e => e.type === filter.type);
        }
        if (filter.search) {
            const s = filter.search.toLowerCase();
            editions = editions.filter(e =>
                e.name.toLowerCase().includes(s) ||
                e.city.toLowerCase().includes(s) ||
                e.state.toLowerCase().includes(s)
            );
        }
        return editions;
    }

    async getEditionById(id) {
        const editions = await this.getEditions();
        return editions.find(edition => edition.id === id) || null;
    }

    async addEdition(editionData) {
        await this._delay();
        await this._requirePermission('editions:write');
        const db = this._read();

        const newEdition = {
            id: 'ed_' + Date.now(),
            name: editionData.name.trim(),
            type: editionData.type || 'Encontro',
            city: editionData.city.trim(),
            state: editionData.state.trim().toUpperCase(),
            country: editionData.country ? editionData.country.trim() : 'Brasil',
            date: editionData.date.trim(),
            description: editionData.description ? editionData.description.trim() : '',
            image: editionData.image || 'assets/images/noite_clamor.jpg',
            status: editionData.status || 'Planejamento',
            registrationType: editionData.registrationType || 'free',
            price: Number(editionData.price) || 0,
            shirtPrice: Number(editionData.shirtPrice) || 0,
            shirtSizes: Array.isArray(editionData.shirtSizes) ? editionData.shirtSizes : (editionData.shirtSizes ? editionData.shirtSizes.split(',').map(s => s.trim()) : []),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('editions').insert({
                id: newEdition.id,
                name: newEdition.name,
                type: newEdition.type,
                city: newEdition.city,
                state: newEdition.state,
                country: newEdition.country,
                date: newEdition.date,
                description: newEdition.description,
                image: newEdition.image,
                status: newEdition.status,
                registration_type: newEdition.registrationType,
                price: newEdition.price,
                shirt_price: newEdition.shirtPrice,
                shirt_sizes: newEdition.shirtSizes,
                created_at: newEdition.createdAt,
                updated_at: newEdition.updatedAt
            });
            if (error) throw new Error(`Não foi possível salvar a edição no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }

        db.editions = db.editions || [];
        db.editions.unshift(newEdition);
        this._save(db);

        await this.addAuditLog('EDIÇÃO_CRIADA', newEdition.name, `Edição criada com status: ${newEdition.status} e tipo de inscrição: ${newEdition.registrationType}`);
        return newEdition;
    }

    async updateEdition(id, patch) {
        await this._delay();
        await this._requirePermission('editions:write');
        const db = this._read();
        const idx = (db.editions || []).findIndex(e => e.id === id);
        const old = idx !== -1 ? db.editions[idx] : await this.getEditionById(id);
        if (!old) throw new Error('Edição não encontrada.');

        const updated = {
            ...old,
            ...patch,
            updatedAt: new Date().toISOString()
        };

        if (patch.price !== undefined) updated.price = Number(patch.price) || 0;
        if (patch.shirtPrice !== undefined) updated.shirtPrice = Number(patch.shirtPrice) || 0;
        if (patch.shirtSizes !== undefined && !Array.isArray(patch.shirtSizes)) {
            updated.shirtSizes = patch.shirtSizes ? patch.shirtSizes.split(',').map(s => s.trim()) : [];
        }

        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('editions').upsert({
                id: updated.id,
                name: updated.name,
                type: updated.type,
                city: updated.city,
                state: updated.state,
                country: updated.country || 'Brasil',
                date: updated.date,
                description: updated.description || '',
                image: updated.image || 'assets/images/noite_clamor.jpg',
                status: updated.status,
                registration_type: updated.registrationType || 'free',
                price: Number(updated.price) || 0,
                shirt_price: Number(updated.shirtPrice) || 0,
                shirt_sizes: Array.isArray(updated.shirtSizes) ? updated.shirtSizes : [],
                created_at: updated.createdAt || new Date().toISOString(),
                updated_at: updated.updatedAt
            }, { onConflict: 'id' });
            if (error) throw new Error(`Não foi possível atualizar a edição no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }

        db.editions = db.editions || [];
        if (idx !== -1) {
            db.editions[idx] = updated;
        } else {
            db.editions.unshift(updated);
        }
        this._save(db);

        await this.addAuditLog('EDIÇÃO_ATUALIZADA', updated.name, `Campos modificados: ${Object.keys(patch).join(', ')}`);
        return updated;
    }

    async deleteEdition(id) {
        await this._delay();
        await this._requirePermission('editions:write');
        const db = this._read();
        const target = (db.editions || []).find(e => e.id === id) || await this.getEditionById(id);
        if (!target) throw new Error('Edição não encontrada.');

        if (this._hasRemoteDataSource()) {
            // Remove ações e inscrições vinculadas quando permitido
            await this.supabase.from('actions').delete().eq('edition_id', id);
            await this.supabase.from('enrollments').delete().eq('edition_id', id);
            const { error } = await this.supabase.from('editions').delete().eq('id', id);
            if (error) throw new Error(`Não foi possível excluir a edição no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }

        // Remove ações vinculadas
        db.actions = (db.actions || []).filter(a => a.editionId !== id);
        // Remove inscrições vinculadas
        db.enrollments = (db.enrollments || []).filter(en => en.editionId !== id);
        // Remove edição
        db.editions = (db.editions || []).filter(e => e.id !== id);

        this._save(db);
        await this.addAuditLog('EDIÇÃO_EXCLUÍDA', target.name, `Edição e todas as suas ações e inscrições foram excluídas`);
        return true;
    }

    /* Compatibilidade com código legado que chamava getEvents/addEvent/deleteEvent */
    async getEvents() { return this.getEditions(); }
    async addEvent(ev) { return this.addEdition(ev); }
    async deleteEvent(id) { return this.deleteEdition(id); }

    /* ==========================================================================
       2. AÇÕES VINCULADAS ÀS EDIÇÕES
       ========================================================================== */
    async getActions(editionId = null) {
        await this._delay();
        const remoteRows = await this._selectRemoteRows('actions');
        let actions = remoteRows === null
            ? (this._read().actions || [])
            : remoteRows.map(row => ({
                id: row.id,
                editionId: row.edition_id || '',
                title: row.title || '',
                date: row.date || '',
                time: row.time || '',
                location: row.location || '',
                leader: row.leader || '',
                description: row.description || '',
                status: row.status || '',
                createdAt: row.created_at || ''
            }));
        if (editionId) {
            actions = actions.filter(a => a.editionId === editionId);
        }
        return actions;
    }

    async addAction(actionData) {
        await this._delay();
        await this._requirePermission('actions:write');
        const db = this._read();

        const edition = (db.editions || []).find(e => e.id === actionData.editionId) || await this.getEditionById(actionData.editionId);
        if (!edition) throw new Error('A edição vinculada não existe.');

        const newAction = {
            id: 'act_' + Date.now(),
            editionId: actionData.editionId,
            title: actionData.title.trim(),
            date: actionData.date ? actionData.date.trim() : '',
            time: actionData.time ? actionData.time.trim() : '',
            location: actionData.location ? actionData.location.trim() : '',
            leader: actionData.leader ? actionData.leader.trim() : '',
            description: actionData.description ? actionData.description.trim() : '',
            status: actionData.status || 'Planejada',
            createdAt: new Date().toISOString()
        };

        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('actions').insert({
                id: newAction.id,
                edition_id: newAction.editionId,
                title: newAction.title,
                date: newAction.date,
                time: newAction.time,
                location: newAction.location,
                leader: newAction.leader,
                description: newAction.description,
                status: newAction.status,
                created_at: newAction.createdAt
            });
            if (error) throw new Error(`Não foi possível salvar a ação no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }

        db.actions = db.actions || [];
        db.actions.push(newAction);
        this._save(db);

        await this.addAuditLog('AÇÃO_CRIADA', `${newAction.title} (${edition.name})`, `Nova ação missionária cadastrada na edição`);
        return newAction;
    }

    async updateAction(id, patch) {
        await this._delay();
        await this._requirePermission('actions:write');
        const db = this._read();
        const idx = (db.actions || []).findIndex(a => a.id === id);
        let existing = idx !== -1 ? db.actions[idx] : null;
        if (!existing) {
            const allActions = await this.getActions();
            existing = allActions.find(a => a.id === id) || null;
        }
        if (!existing) throw new Error('Ação não encontrada.');

        const updated = { ...existing, ...patch };

        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('actions').upsert({
                id: updated.id,
                edition_id: updated.editionId,
                title: updated.title,
                date: updated.date || '',
                time: updated.time || '',
                location: updated.location || '',
                leader: updated.leader || '',
                description: updated.description || '',
                status: updated.status || 'Planejada',
                created_at: updated.createdAt || new Date().toISOString()
            }, { onConflict: 'id' });
            if (error) throw new Error(`Não foi possível atualizar a ação no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }

        db.actions = db.actions || [];
        if (idx !== -1) {
            db.actions[idx] = updated;
        } else {
            db.actions.push(updated);
        }
        this._save(db);

        await this.addAuditLog('AÇÃO_ATUALIZADA', updated.title, `Ação missionária atualizada`);
        return updated;
    }

    async deleteAction(id) {
        await this._delay();
        await this._requirePermission('actions:write');
        const db = this._read();
        let action = (db.actions || []).find(a => a.id === id);
        if (!action) {
            const allActions = await this.getActions();
            action = allActions.find(a => a.id === id);
        }
        if (!action) return false;

        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('actions').delete().eq('id', id);
            if (error) throw new Error(`Não foi possível excluir a ação no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }

        db.actions = (db.actions || []).filter(a => a.id !== id);
        this._save(db);

        await this.addAuditLog('AÇÃO_EXCLUÍDA', action.title, `Ação missionária removida da edição`);
        return true;
    }

    /* ==========================================================================
       3. PARTICIPANTES & VOLUNTÁRIOS
       ========================================================================== */
    getCurrentParticipant() {
        const raw = sessionStorage.getItem(JCP_PARTICIPANT_SESSION_KEY) || localStorage.getItem(JCP_PARTICIPANT_SESSION_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    }

    setCurrentParticipant(participant) {
        if (!participant) {
            sessionStorage.removeItem(JCP_PARTICIPANT_SESSION_KEY);
            localStorage.removeItem(JCP_PARTICIPANT_SESSION_KEY);
        } else {
            const data = JSON.stringify(participant);
            sessionStorage.setItem(JCP_PARTICIPANT_SESSION_KEY, data);
            localStorage.setItem(JCP_PARTICIPANT_SESSION_KEY, data);
        }
    }

    async getParticipants(filter = {}) {
        await this._delay();
        let participants;
        if (this._hasRemoteDataSource() && await this.getCurrentAdmin()) {
            await this._requirePermission('volunteers:read');
            participants = (await this._selectRemoteRows('participants') || []).map(row => this._mapRemoteParticipant(row));
        } else {
            participants = this._read().participants || [];
        }

        if (filter.isVolunteer !== undefined) {
            participants = participants.filter(p => p.isVolunteer === filter.isVolunteer);
        }
        if (filter.status) {
            participants = participants.filter(p => p.status === filter.status);
        }
        if (filter.search) {
            const s = filter.search.toLowerCase();
            participants = participants.filter(p =>
                p.name.toLowerCase().includes(s) ||
                p.phone.includes(s) ||
                p.email.toLowerCase().includes(s) ||
                (p.church && p.church.toLowerCase().includes(s))
            );
        }
        return participants;
    }

    async getVolunteers(filter = {}) {
        return this.getParticipants({ ...filter, isVolunteer: true });
    }

    async getParticipantByPhone(phone) {
        const cleanPhone = this._normalizeBrazilPhone(phone);
        return (await this.getParticipants()).find(p => this._normalizeBrazilPhone(p.phone) === cleanPhone) || null;
    }

    _normalizeBrazilPhone(phone) {
        const digits = String(phone || '').replace(/\D/g, '');
        return digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
            ? digits.slice(2)
            : digits;
    }

    async getParticipantByEmail(email) {
        const normalizedEmail = this._normalizeParticipantEmail(email);
        const matches = (await this.getParticipants()).filter(p => this._normalizeParticipantEmail(p.email) === normalizedEmail);
        return matches.length === 1 ? matches[0] : null;
    }

    _normalizeParticipantEmail(email) {
        return String(email || '').trim().toLowerCase();
    }

    async registerParticipant(data) {
        await this._delay();
        const db = this._read();
        db.participants = db.participants || [];

        const cleanPhone = (data.phone || '').trim();
        const cleanEmail = (data.email || '').trim().toLowerCase();

        // Evitar duplicidade pelo Telefone (ID único do participante)
        let existing = db.participants.find(p => this._normalizeBrazilPhone(p.phone) === this._normalizeBrazilPhone(cleanPhone));
        if (existing && this._normalizeParticipantEmail(existing.email) !== this._normalizeParticipantEmail(cleanEmail)) {
            throw new Error('Este telefone ja esta vinculado a outro e-mail. Fale com a coordenacao para atualizar o cadastro.');
        }

        const emailOwner = db.participants.find(p =>
            this._normalizeParticipantEmail(p.email) === this._normalizeParticipantEmail(cleanEmail) &&
            this._normalizeBrazilPhone(p.phone) !== this._normalizeBrazilPhone(cleanPhone)
        );
        if (emailOwner) throw new Error('Este e-mail ja esta vinculado a outro cadastro.');

        const targetParticipant = existing ? {
            ...existing,
            name: data.name.trim(),
            birthDate: data.birthDate || existing.birthDate,
            email: cleanEmail || existing.email,
            address: data.address || existing.address || { street: '', number: '', neighborhood: '', city: '', state: '' },
            pastor: data.pastor || existing.pastor || '',
            church: data.church || existing.church || '',
            isVolunteer: data.isVolunteer !== undefined ? Boolean(data.isVolunteer) : Boolean(existing.isVolunteer),
            volunteerAreas: data.volunteerAreas || existing.volunteerAreas || [],
            volunteerOtherDetails: data.volunteerOtherDetails !== undefined ? data.volunteerOtherDetails : (existing.volunteerOtherDetails || ''),
            updatedAt: new Date().toISOString()
        } : {
            id: 'part_' + Date.now(),
            name: data.name.trim(),
            birthDate: data.birthDate || '',
            phone: cleanPhone,
            email: cleanEmail,
            address: data.address || { street: '', number: '', neighborhood: '', city: '', state: '' },
            pastor: data.pastor ? data.pastor.trim() : '',
            church: data.church ? data.church.trim() : '',
            isVolunteer: Boolean(data.isVolunteer),
            volunteerAreas: Array.isArray(data.volunteerAreas) ? data.volunteerAreas : [],
            volunteerOtherDetails: data.volunteerOtherDetails ? data.volunteerOtherDetails.trim() : '',
            status: 'Ativo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this._hasRemoteDataSource()) {
            try {
                const addr = targetParticipant.address || {};
                const remotePayload = {
                    id: targetParticipant.id,
                    name: targetParticipant.name,
                    birth_date: targetParticipant.birthDate || '',
                    phone: targetParticipant.phone,
                    email: targetParticipant.email,
                    city: addr.city || '',
                    state: addr.state || '',
                    street: addr.street || '',
                    neighborhood: addr.neighborhood || '',
                    pastor: targetParticipant.pastor || '',
                    church: targetParticipant.church || '',
                    is_volunteer: Boolean(targetParticipant.isVolunteer),
                    volunteer_areas: Array.isArray(targetParticipant.volunteerAreas) ? targetParticipant.volunteerAreas : [],
                    volunteer_other_details: targetParticipant.volunteerOtherDetails || '',
                    status: targetParticipant.status || 'Ativo',
                    created_at: targetParticipant.createdAt,
                    updated_at: targetParticipant.updatedAt
                };
                const client = this.participantAuth || this.supabase;
                await client.from('participants').upsert(remotePayload, { onConflict: 'id' });
            } catch {
                // Mantém salvamento local caso RLS ainda restrinja escrita de participante
            }
        }

        if (existing) {
            Object.assign(existing, targetParticipant);
            this._save(db);
            this.setCurrentParticipant(existing);
            await this.addAuditLog('CADASTRO_ATUALIZADO', existing.name, `Participante atualizou informações cadastrais`);
            return existing;
        }

        db.participants.unshift(targetParticipant);
        this._save(db);
        this.setCurrentParticipant(targetParticipant);

        const logAction = targetParticipant.isVolunteer ? 'CADASTRO_VOLUNTÁRIO' : 'CADASTRO_PARTICIPANTE';
        await this.addAuditLog(logAction, targetParticipant.name, `Novo cadastro realizado (Telefone: ${targetParticipant.phone}, Voluntário: ${targetParticipant.isVolunteer ? 'SIM' : 'NÃO'})`);
        return targetParticipant;
    }

    async updateParticipant(id, patch) {
        await this._delay();
        await this._requirePermission('volunteers:write');
        const db = this._read();
        const idx = (db.participants || []).findIndex(p => p.id === id);
        let existing = idx !== -1 ? db.participants[idx] : null;
        if (!existing) {
            const allParts = await this.getParticipants();
            existing = allParts.find(p => p.id === id) || null;
        }
        if (!existing) throw new Error('Participante não encontrado.');

        const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };

        if (this._hasRemoteDataSource()) {
            const addr = updated.address || {};
            const { error } = await this.supabase.from('participants').upsert({
                id: updated.id,
                name: updated.name,
                birth_date: updated.birthDate || '',
                phone: updated.phone || '',
                email: updated.email || '',
                city: addr.city || '',
                state: addr.state || '',
                street: addr.street || '',
                neighborhood: addr.neighborhood || '',
                pastor: updated.pastor || '',
                church: updated.church || '',
                is_volunteer: Boolean(updated.isVolunteer),
                volunteer_areas: Array.isArray(updated.volunteerAreas) ? updated.volunteerAreas : [],
                volunteer_other_details: updated.volunteerOtherDetails || '',
                status: updated.status || 'Ativo',
                created_at: updated.createdAt || new Date().toISOString(),
                updated_at: updated.updatedAt
            }, { onConflict: 'id' });
            if (error) throw new Error(`Não foi possível atualizar o participante no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }

        db.participants = db.participants || [];
        if (idx !== -1) {
            db.participants[idx] = updated;
        } else {
            db.participants.unshift(updated);
        }
        this._save(db);

        await this.addAuditLog('PARTICIPANTE_ATUALIZADO', updated.name, `Registro de participante/voluntário alterado`);
        return updated;
    }

    async deleteParticipant(id) {
        await this._delay();
        await this._requirePermission('volunteers:write');
        const db = this._read();
        let part = (db.participants || []).find(p => p.id === id);
        if (!part) {
            const allParts = await this.getParticipants();
            part = allParts.find(p => p.id === id);
        }
        if (!part) return false;

        if (this._hasRemoteDataSource()) {
            await this.supabase.from('enrollments').delete().eq('participant_id', id);
            const { error } = await this.supabase.from('participants').delete().eq('id', id);
            if (error) throw new Error(`Não foi possível excluir o participante no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }

        db.participants = (db.participants || []).filter(p => p.id !== id);
        // Exclui inscrições vinculadas
        db.enrollments = (db.enrollments || []).filter(en => en.participantId !== id);

        this._save(db);
        await this.addAuditLog('PARTICIPANTE_EXCLUÍDO', part.name, `Participante e suas inscrições foram removidos`);
        return true;
    }

    /* Compatibilidade para voluntários no admin antigo */
    async getMembers() {
        const parts = await this.getParticipants();
        return parts.map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            city: typeof p.address === 'object' ? `${p.address.city || ''} – ${p.address.state || ''}` : (p.address || ''),
            date: p.createdAt ? p.createdAt.split('T')[0] : '',
            status: p.status || 'Ativo',
            isVolunteer: p.isVolunteer,
            volunteerAreas: p.volunteerAreas || []
        }));
    }
    async addMember(m) {
        return this.registerParticipant({
            name: m.name,
            email: m.email,
            phone: m.phone || '(83) 99999-0000',
            address: { city: m.city || 'Patos', state: 'PB' },
            isVolunteer: true,
            volunteerAreas: ['Apoio']
        });
    }
    async deleteMember(id) {
        return this.deleteParticipant(id);
    }

    /* ==========================================================================
       4. INSCRIÇÕES (ENROLLMENTS) & COMPROVANTES
       ========================================================================== */
    async getEnrollments(filter = {}) {
        await this._delay();
        const isAdmin = this._hasRemoteDataSource() && await this.getCurrentAdmin();
        if (isAdmin) await this._requirePermission('enrollments:read');
        const remoteRows = isAdmin ? await this._selectRemoteRows('enrollments') : null;
        if (remoteRows !== null) {
            const editions = await this.getEditions();
            let enrollments = remoteRows.map(row => {
                const participant = row.participant_name || row.participant_phone || row.participant_email
                    ? { id: row.participant_id || '', name: row.participant_name || '', phone: row.participant_phone || '', email: row.participant_email || '' }
                    : null;
                const edition = editions.find(item => item.id === row.edition_id)
                    || (row.edition_name ? { id: row.edition_id || '', name: row.edition_name } : null);
                return this._mapRemoteEnrollment(row, participant, edition);
            });
            if (filter.editionId) enrollments = enrollments.filter(item => item.editionId === filter.editionId);
            if (filter.participantId) enrollments = enrollments.filter(item => item.participantId === filter.participantId);
            if (filter.status) enrollments = enrollments.filter(item => item.status === filter.status);
            if (filter.paymentStatus) enrollments = enrollments.filter(item => item.paymentStatus === filter.paymentStatus);
            return enrollments;
        }

        const db = this._read();
        let enrollments = db.enrollments || [];

        if (filter.editionId) {
            enrollments = enrollments.filter(e => e.editionId === filter.editionId);
        }
        if (filter.participantId) {
            enrollments = enrollments.filter(e => e.participantId === filter.participantId);
        }
        if (filter.status) {
            enrollments = enrollments.filter(e => e.status === filter.status);
        }
        if (filter.paymentStatus) {
            enrollments = enrollments.filter(e => e.paymentStatus === filter.paymentStatus);
        }

        // Popula relacionamentos com Participante e Edição
        return enrollments.map(en => {
            const participant = (db.participants || []).find(p => p.id === en.participantId) || null;
            const edition = (db.editions || []).find(e => e.id === en.editionId) || null;
            return {
                ...en,
                participant,
                edition
            };
        });
    }

    async createEnrollment(data) {
        await this._delay();
        const db = this._read();

        const edition = (db.editions || []).find(e => e.id === data.editionId) || await this.getEditionById(data.editionId);
        if (!edition) throw new Error('Edição selecionada não foi encontrada.');

        let participant = null;
        if (data.participantId) {
            participant = (db.participants || []).find(p => p.id === data.participantId) || this.getCurrentParticipant();
        } else if (data.participantData) {
            participant = await this.registerParticipant(data.participantData);
        }

        if (!participant) throw new Error('Dados do participante inválidos.');

        // Verifica se já está inscrito nesta edição
        const existing = (db.enrollments || []).find(en => en.editionId === edition.id && en.participantId === participant.id && en.status !== 'Cancelada');
        if (existing) {
            throw new Error(`O participante ${participant.name} já possui uma inscrição ativa nesta edição.`);
        }

        // Validação da Inscrição com Camisa
        if (edition.registrationType === 'shirt') {
            if (!data.shirtSize) {
                throw new Error('É obrigatório selecionar o tamanho da camisa.');
            }
            if (!data.proofFile) {
                throw new Error('O comprovante de pagamento é obrigatório para inscrição com camisa.');
            }
        }

        // Validação da Inscrição com Taxa
        if (edition.registrationType === 'paid') {
            if (!data.proofFile) {
                throw new Error('O comprovante de pagamento da taxa é obrigatório.');
            }
        }

        const isPaid = edition.registrationType === 'paid' || edition.registrationType === 'shirt';
        const amount = edition.registrationType === 'shirt' ? (edition.shirtPrice || 45) : (edition.registrationType === 'paid' ? (edition.price || 0) : 0);

        const newEnrollment = {
            id: 'enr_' + Date.now(),
            editionId: edition.id,
            participantId: participant.id,
            registrationType: edition.registrationType,
            shirtSize: data.shirtSize || '',
            amount,
            status: isPaid ? 'Pendente' : 'Confirmada',
            paymentStatus: isPaid ? 'Comprovante Enviado' : 'Isento',
            proofFile: data.proofFile || '',
            proofFileName: data.proofFileName || (data.proofFile ? 'comprovante_pagamento.png' : ''),
            adminNotes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this._hasRemoteDataSource()) {
            try {
                const client = this.participantAuth || this.supabase;
                await client.from('enrollments').insert({
                    id: newEnrollment.id,
                    edition_id: edition.id,
                    edition_name: edition.name,
                    participant_id: participant.id,
                    participant_name: participant.name,
                    participant_phone: participant.phone,
                    participant_email: participant.email,
                    registration_type: newEnrollment.registrationType,
                    shirt_size: newEnrollment.shirtSize,
                    amount_paid: newEnrollment.amount,
                    status: newEnrollment.status,
                    payment_status: newEnrollment.paymentStatus,
                    proof_url: newEnrollment.proofFile,
                    proof_file_name: newEnrollment.proofFileName,
                    admin_notes: '',
                    created_at: newEnrollment.createdAt,
                    updated_at: newEnrollment.updatedAt
                });
            } catch {
                // Preserva fluxo local caso RLS ainda não tenha a policy pública/autenticada aplicada
            }
        }

        db.enrollments = db.enrollments || [];
        db.enrollments.unshift(newEnrollment);
        this._save(db);

        await this.addAuditLog(
            'INSCRIÇÃO_REALIZADA',
            `${participant.name} — ${edition.name}`,
            `Inscrição criada. Tipo: ${edition.registrationType}${newEnrollment.shirtSize ? ', Camisa: ' + newEnrollment.shirtSize : ''}, Valor: R$ ${amount.toFixed(2)}`
        );

        return {
            ...newEnrollment,
            participant,
            edition
        };
    }

    async updateEnrollmentStatus(id, newStatus, paymentStatus, adminNotes = '') {
        await this._delay();
        await this._requirePermission('enrollments:write');
        const db = this._read();
        const idx = (db.enrollments || []).findIndex(e => e.id === id);
        let en = idx !== -1 ? db.enrollments[idx] : null;
        if (!en) {
            const allEn = await this.getEnrollments();
            en = allEn.find(e => e.id === id) || null;
        }
        if (!en) throw new Error('Inscrição não encontrada.');

        en.status = newStatus || en.status;
        if (paymentStatus) en.paymentStatus = paymentStatus;
        if (adminNotes) en.adminNotes = adminNotes;
        en.updatedAt = new Date().toISOString();

        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('enrollments').update({
                status: en.status,
                payment_status: en.paymentStatus,
                admin_notes: en.adminNotes || '',
                updated_at: en.updatedAt
            }).eq('id', id);
            if (error) throw new Error(`Não foi possível atualizar a inscrição no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }

        db.enrollments = db.enrollments || [];
        if (idx !== -1) {
            db.enrollments[idx] = en;
        } else {
            db.enrollments.unshift(en);
        }
        this._save(db);

        const participant = (db.participants || []).find(p => p.id === en.participantId) || en.participant;
        const pName = participant ? participant.name : (en.participantName || 'Participante');

        await this.addAuditLog(
            'INSCRIÇÃO_ATUALIZADA',
            `Inscrição #${id} (${pName})`,
            `Status alterado para "${en.status}", Pagamento: "${en.paymentStatus}". ${adminNotes ? 'Obs: ' + adminNotes : ''}`
        );

        return en;
    }

    async deleteEnrollment(id) {
        await this._delay();
        await this._requirePermission('enrollments:write');
        const db = this._read();
        let en = (db.enrollments || []).find(e => e.id === id);
        if (!en) {
            const allEn = await this.getEnrollments();
            en = allEn.find(e => e.id === id);
        }
        if (!en) return false;

        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('enrollments').delete().eq('id', id);
            if (error) throw new Error(`Não foi possível excluir a inscrição no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }

        db.enrollments = (db.enrollments || []).filter(e => e.id !== id);
        this._save(db);

        await this.addAuditLog('INSCRIÇÃO_EXCLUÍDA', `Inscrição #${id}`, `Inscrição cancelada e excluída pelo administrador`);
        return true;
    }

    /* ==========================================================================
       5. ADMINISTRADORES & PERMISSÕES
       ========================================================================== */
    async getAdmins() {
        await this._delay();
        await this._requirePermission('users:manage');
        const result = await this._invokeAdminManagement('list');
        return result.admins || [];
    }

    async getRoles() {
        await this._delay();
        await this._requirePermission('users:manage');
        if (!this.supabase) throw new Error('Supabase não está configurado.');
        const { data, error } = await this.supabase
            .from('jcp_admin_roles')
            .select('id, name, description, permissions')
            .order('name');
        if (error) throw new Error('Não foi possível carregar os perfis de acesso no Supabase.');
        return (data || []).map(role => ({ ...role, isSystem: ['super_admin', 'coordenador', 'midia'].includes(role.id) }));
    }

    async addAdmin(data) {
        await this._delay();
        await this._requirePermission('users:manage');
        const result = await this._invokeAdminManagement('invite', {
            name: data.name,
            email: data.email,
            roleId: data.roleId,
            status: data.status || 'Ativo',
            redirectTo: new URL('./admin.html', window.location.href).href
        });
        await this.addAuditLog('ADMIN_CONVIDADO', result.admin?.name || data.name, `Convite administrativo enviado com perfil: ${data.roleId}`);
        return { ...result.admin, invited: result.invited === true };
    }

    async updateAdmin(id, patch) {
        await this._delay();
        await this._requirePermission('users:manage');
        const result = await this._invokeAdminManagement('set-status', { userId: id, status: patch.status });
        await this.addAuditLog('ADMIN_STATUS_ATUALIZADO', result.admin?.display_name || id, `Status atualizado para ${patch.status}`);
        return result.admin;
    }

    async deleteAdmin(id) {
        await this._delay();
        await this._requirePermission('users:manage');
        throw new Error('Contas Auth não são excluídas pelo painel. Inative o perfil para remover o acesso.');
    }

    async addRole(roleData) {
        await this._delay();
        await this._requirePermission('users:manage');
        if (!this.supabase) throw new Error('Supabase não está configurado.');
        const name = String(roleData.name || '').trim();
        if (name.length < 2 || name.length > 80) throw new Error('Informe um nome de perfil entre 2 e 80 caracteres.');
        const id = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 64);
        const allowedPermissions = new Set([
            'dashboard:read', 'editions:read', 'editions:write', 'actions:read', 'actions:write',
            'volunteers:read', 'volunteers:write', 'enrollments:read', 'enrollments:write',
            'contributions:read', 'leaders:read', 'leaders:write', 'media:read', 'media:write',
            'content:read', 'content:write', 'logs:read', 'settings:write', 'users:manage'
        ]);
        const permissions = [...new Set((Array.isArray(roleData.permissions) ? roleData.permissions : [])
            .filter(permission => allowedPermissions.has(permission)))];
        const { data: role, error } = await this.supabase
            .from('jcp_admin_roles')
            .insert({ id, name, description: String(roleData.description || '').trim().slice(0, 500), permissions })
            .select('id, name, description, permissions')
            .single();
        if (error) throw new Error(error.code === '23505' ? 'Já existe um perfil com este nome.' : 'Não foi possível criar o perfil no Supabase.');
        const newRole = { ...role, isSystem: false };
        await this.addAuditLog('PERFIL_CRIADO', name, 'Novo perfil de permissões criado no Supabase');
        return newRole;
    }

    async _invokeAdminManagement(action, payload = {}) {
        if (!this.supabase) throw new Error('Supabase não está configurado.');
        const { data, error } = await this.supabase.functions.invoke('jcp-admin-management', {
            body: { action, ...payload }
        });
        if (error) {
            let detail = '';
            try { detail = (await error.context?.json())?.error || ''; } catch { /* gateway response may not be JSON */ }
            throw new Error(detail || 'A Edge Function de gestão não está disponível. Confira o deploy e os secrets do projeto de teste.');
        }
        if (data?.error) throw new Error(data.error);
        return data || {};
    }
    /* ==========================================================================
       6. CONFIGURAÃ‡Ã•ES GLOBAIS
       ========================================================================== */
    async getSettings() {
        await this._delay();
        const remoteRows = await this._selectRemoteRows('settings');
        if (remoteRows !== null) {
            const row = remoteRows[0];
            if (!row) return {};
            return {
                id: row.id,
                pixKey: row.pix_key || '',
                pixKeyType: row.pix_key_type || '',
                pixBeneficiary: row.pix_beneficiary || '',
                pixBank: row.pix_bank || '',
                pixCity: row.pix_city || '',
                pixNotice: row.pix_notice || '',
                contactEmail: row.contact_email || '',
                contactPhone: row.contact_phone || '',
                instagram: row.instagram || '',
                updatedAt: row.updated_at || ''
            };
        }
        const db = this._read();
        return db.settings || {
            pixKey: 'projetojovenscomproposito@gmail.com',
            pixKeyType: 'E-mail',
            pixBeneficiary: 'Projeto Jovens com Propósito',
            pixBank: 'Banco do Brasil',
            pixCity: 'Patos - PB',
            pixNotice: 'Sua contribuição sustenta a realização dos encontros e viagens missionárias pelo sertão.'
        };
    }

    async updateSettings(patch) {
        await this._delay();
        await this._requirePermission('settings:write');
        const db = this._read();
        const currentRemote = await this.getSettings().catch(() => ({}));

        const oldSettings = { ...(db.settings || {}), ...(currentRemote || {}) };
        const updatedSettings = {
            ...oldSettings,
            ...patch,
            id: oldSettings.id || 'global_settings',
            updatedAt: new Date().toISOString()
        };

        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('settings').upsert({
                id: updatedSettings.id,
                pix_key: updatedSettings.pixKey || '',
                pix_key_type: updatedSettings.pixKeyType || 'E-mail',
                pix_beneficiary: updatedSettings.pixBeneficiary || '',
                pix_bank: updatedSettings.pixBank || '',
                pix_city: updatedSettings.pixCity || '',
                pix_notice: updatedSettings.pixNotice || '',
                contact_email: updatedSettings.contactEmail || '',
                contact_phone: updatedSettings.contactPhone || '',
                instagram: updatedSettings.instagram || '',
                updated_at: updatedSettings.updatedAt
            }, { onConflict: 'id' });
            if (error) throw new Error(`Não foi possível atualizar as configurações no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }

        db.settings = updatedSettings;
        this._save(db);

        await this.addAuditLog(
            'CONFIG_ATUALIZADA',
            'Configurações Globais',
            `Configurações do sistema atualizadas: ${Object.keys(patch).join(', ')}`
        );
        return db.settings;
    }

    /* ==========================================================================
       7. CONTRIBUIÇÕES VOLUNTÁRIAS
       ========================================================================== */
    async getContributions() {
        await this._delay();
        if (this._hasRemoteDataSource() && await this.getCurrentAdmin()) {
            await this._requirePermission('contributions:read');
            const remoteRows = await this._selectRemoteRows('contributions');
            return (remoteRows || []).map(row => this._mapRemoteContribution(row));
        }
        const db = this._read();
        return db.contributions || [];
    }

    async addContribution(contrib) {
        await this._delay();
        const db = this._read();
        const newContrib = {
            id: 'cnt_' + Date.now(),
            donorName: contrib.donorName ? contrib.donorName.trim() : 'Doador Anônimo',
            email: contrib.email ? contrib.email.trim() : '',
            phone: contrib.phone ? contrib.phone.trim() : '',
            amount: Number(contrib.amount) || 0,
            date: new Date().toISOString(),
            paymentMethod: contrib.paymentMethod || 'PIX',
            proofFile: contrib.proofFile || '',
            proofFileName: contrib.proofFileName || '',
            notes: contrib.notes || '',
            status: 'Confirmado'
        };

        db.contributions = db.contributions || [];
        db.contributions.unshift(newContrib);
        this._save(db);

        await this.addAuditLog('CONTRIBUIÇÃO_RECEBIDA', `R$ ${newContrib.amount.toFixed(2)} (${newContrib.donorName})`, `Contribuição voluntária via PIX registrada`);
        return newContrib;
    }

    /* ==========================================================================
       8. CMS & MENSAGENS DO FORMULÁRIO
       ========================================================================== */
    async getContent() {
        await this._delay();
        const db = this._read();
        const localContent = db.content || {};
        if (this._hasRemoteDataSource()) {
            try {
                const { data: rows, error } = await this.supabase.from('cms_content').select('*');
                if (!error && Array.isArray(rows) && rows.length > 0) {
                    const content = { ...localContent };
                    for (const row of rows) {
                        const key = row.content_key || row.key || row.slug || row.section;
                        const value = row.content_value ?? row.value ?? row.content ?? row.text;
                        if (key && value !== undefined) content[key] = value;
                    }
                    const first = rows[0];
                    if (first.hero_title ?? first.heroTitle ?? content.hero_title ?? content.heroTitle) {
                        content.heroTitle = first.hero_title ?? first.heroTitle ?? content.hero_title ?? content.heroTitle;
                    }
                    if (first.hero_subtitle ?? first.heroSubtitle ?? content.hero_subtitle ?? content.heroSubtitle) {
                        content.heroSubtitle = first.hero_subtitle ?? first.heroSubtitle ?? content.hero_subtitle ?? content.heroSubtitle;
                    }
                    if (first.about_text ?? first.aboutText ?? content.about_text ?? content.aboutText) {
                        content.aboutText = first.about_text ?? first.aboutText ?? content.about_text ?? content.aboutText;
                    }
                    return content;
                }
            } catch {
                // Fallback para cache local caso cms_content não esteja público para anon
            }
        }
        return localContent;
    }

    async updateContent(patch) {
        await this._delay();
        await this._requirePermission('content:write');
        const db = this._read();
        const currentContent = await this.getContent().catch(() => (db.content || {}));
        const nextContent = { ...(db.content || {}), ...currentContent, ...patch };

        if (this._hasRemoteDataSource()) {
            try {
                const keyMap = {
                    heroTitle: 'hero_title',
                    heroSubtitle: 'hero_subtitle',
                    aboutText: 'about_text'
                };
                for (const [jsKey, val] of Object.entries(patch)) {
                    const snakeKey = keyMap[jsKey] || jsKey;
                    await this.supabase.from('cms_content').upsert({
                        id: snakeKey,
                        key: snakeKey,
                        value: String(val ?? ''),
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });
                }
            } catch {
                // Caso o schema remoto use colunas diferentes, preserva atualização local sem travar
            }
        }

        db.content = nextContent;
        this._save(db);

        await this.addAuditLog('CONTEÚDO_CMS_ATUALIZADO', 'Textos do Site', `Alteração de conteúdo da landing page`);
        return db.content;
    }

    async getMessages() {
        await this._delay();
        const db = this._read();
        return db.messages || [];
    }

    async markMessageAsRead(id) {
        await this._delay();
        const db = this._read();
        const msg = (db.messages || []).find(m => m.id === id);
        if (msg) msg.read = true;
        this._save(db);
    }

    async deleteMessage(id) {
        await this._delay();
        const db = this._read();
        db.messages = (db.messages || []).filter(m => m.id !== id);
        this._save(db);
    }

    /* ==========================================================================
       9. DASHBOARD: ESTATÍSTICAS REAIS DO BANCO DE DADOS
       ========================================================================== */
    async getMedia() {
        await this._delay();
        await this._requirePermission('media:read');
        return this._read().media || [];
    }

    async addMedia(item) {
        await this._delay();
        await this._requirePermission('media:write');
        if (!item?.title?.trim() || !item?.src) throw new Error('Informe um título e selecione uma imagem.');
        const db = this._read();
        const media = {
            id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            title: item.title.trim(),
            alt: (item.alt || item.title).trim(),
            src: item.src,
            createdAt: new Date().toISOString()
        };
        db.media = [...(db.media || []), media];
        this._save(db);
        await this.addAuditLog('MÍDIA_ADICIONADA', media.title, 'Imagem adicionada à galeria administrativa');
        return media;
    }

    async deleteMedia(id) {
        await this._delay();
        await this._requirePermission('media:write');
        const db = this._read();
        const item = (db.media || []).find(entry => entry.id === id);
        if (!item) return false;
        db.media = db.media.filter(entry => entry.id !== id);
        this._save(db);
        await this.addAuditLog('MÍDIA_EXCLUÍDA', item.title, 'Imagem removida da galeria administrativa');
        return true;
    }

    async getStats() {
        await this._delay();
        let participants;
        let editions;
        let enrollments;
        let actions;
        let contributions;
        if (this._hasRemoteDataSource() && await this.getCurrentAdmin()) {
            const [canReadParticipants, canReadEnrollments, canReadContributions] = await Promise.all([
                this.hasPermission('volunteers:read'),
                this.hasPermission('enrollments:read'),
                this.hasPermission('contributions:read')
            ]);
            [participants, editions, enrollments, actions, contributions] = await Promise.all([
                canReadParticipants ? this.getParticipants() : Promise.resolve([]),
                this.getEditions(),
                canReadEnrollments ? this.getEnrollments() : Promise.resolve([]),
                this.getActions(),
                canReadContributions ? this.getContributions() : Promise.resolve([])
            ]);
        } else {
            const db = this._read();
            participants = db.participants || [];
            editions = db.editions || [];
            enrollments = db.enrollments || [];
            actions = db.actions || [];
            contributions = db.contributions || [];
        }

        const volunteers = participants.filter(p => p.isVolunteer);

        // Cidades atendidas distintas (reúne cidades das edições e dos participantes)
        const citySet = new Set();
        editions.forEach(e => { if (e.city) citySet.add(e.city.trim().toLowerCase()); });
        participants.forEach(p => {
            if (p.address && p.address.city) citySet.add(p.address.city.trim().toLowerCase());
        });

        // Total arrecadado em R$ (contribuições confirmadas + inscrições aprovadas)
        let totalRaised = contributions.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
        enrollments.forEach(en => {
            if (en.paymentStatus === 'Aprovado' && en.amount) {
                totalRaised += Number(en.amount);
            }
        });

        const activeEditions = editions.filter(e => e.status === 'Inscrições Abertas' || e.status === 'Em Andamento');
        const pendingEnrollments = enrollments.filter(e => e.status === 'Pendente' || e.paymentStatus === 'Comprovante Enviado');

        return {
            totalParticipants: participants.length,
            totalVolunteers: volunteers.length,
            totalEditions: editions.length,
            activeEditions: activeEditions.length,
            totalEnrollments: enrollments.length,
            pendingEnrollments: pendingEnrollments.length,
            totalActions: actions.length,
            citiesCovered: citySet.size || 1,
            totalRaised: totalRaised,
            totalContributions: contributions.length
        };
    }

    /* ==========================================================================
       CONTADOR DE ORAÇÃO (PÚBLICO — REQUER PARTICIPANTE LOGADO)
       ========================================================================== */

    /**
     * Retorna o total de intercessores únicos que registraram oração.
     */
    getPrayerCount() {
        const db = this._read();
        const prayers = db.prayers || [];
        return prayers.length;
    }

    /**
     * Registra a oração de um participante (uma vez por dia por participante).
     * Retorna { success, count, alreadyDone }.
     */
    async registerPrayer() {
        await this._delay();
        const participant = this.getCurrentParticipant();
        if (!participant) {
            throw new Error('É necessário estar logado para registrar sua oração.');
        }

        const db = this._read();
        db.prayers = db.prayers || [];

        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const alreadyToday = db.prayers.find(
            p => p.participantId === participant.id && p.date === today
        );

        if (alreadyToday) {
            return { success: false, alreadyDone: true, count: db.prayers.length };
        }

        const prayerEntry = {
            id: 'prayer_' + Date.now(),
            participantId: participant.id,
            participantName: participant.name || 'Anônimo',
            date: today,
            registeredAt: new Date().toISOString()
        };

        db.prayers.unshift(prayerEntry);
        this._save(db);

        await this.addAuditLog(
            'ORAÇÃO_REGISTRADA',
            participant.name || 'Participante',
            `${participant.name} registrou intercession em ${today}`
        );

        return { success: true, alreadyDone: false, count: db.prayers.length };
    }

    /**
     * Verifica se o participante já orou hoje.
     */
    hasParticipantPrayedToday() {
        const participant = this.getCurrentParticipant();
        if (!participant) return false;
        const db = this._read();
        const prayers = db.prayers || [];
        const today = new Date().toISOString().slice(0, 10);
        return !!prayers.find(p => p.participantId === participant.id && p.date === today);
    }

    /* ==========================================================================
       CONTRIBUIÇÕES PÚBLICAS (SEM NECESSIDADE DE LOGIN)
       ========================================================================== */

    /**
     * Registra uma contribuição pública com comprovante.
     * Não requer autenticação de participante.
     */
    async createPublicContribution(data) {
        await this._delay();
        if (!data.proofFile) {
            throw new Error('O comprovante é obrigatório.');
        }

        const db = this._read();
        db.contributions = db.contributions || [];

        const newContrib = {
            id: 'contrib_' + Date.now(),
            name: (data.name && data.name.trim()) ? data.name.trim() : 'Anônimo',
            donorName: (data.name && data.name.trim()) ? data.name.trim() : 'Anônimo',
            amount: (data.amount && data.amount.trim()) ? data.amount.trim() : '',
            proofFile: data.proofFile,
            proofFileName: data.proofFileName || 'comprovante.png',
            status: 'Confirmada',
            paymentStatus: 'Comprovante Enviado',
            createdAt: new Date().toISOString(),
            adminNotes: ''
        };

        if (this._hasRemoteDataSource()) {
            try {
                const numericAmount = Number(String(newContrib.amount || '0').replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
                await this.supabase.from('contributions').insert({
                    id: newContrib.id,
                    donor_name: newContrib.name,
                    amount: numericAmount,
                    payment_method: 'PIX',
                    proof_url: newContrib.proofFile,
                    proof_file_name: newContrib.proofFileName,
                    status: newContrib.status,
                    created_at: newContrib.createdAt
                });
            } catch {
                // Mantém persistência local se RLS bloquear escrita pública anônima
            }
        }

        db.contributions.unshift(newContrib);
        this._save(db);

        const detailsText = `Comprovante recebido via PIX${newContrib.amount ? '. Valor: ' + newContrib.amount : ''}. Arquivo: ${newContrib.proofFileName}`;
        await this.addAuditLog(
            'CONTRIBUIÇÃO_RECEBIDA',
            newContrib.name,
            detailsText
        );

        return newContrib;
    }

    /* ==========================================================================
       DEPARTAMENTOS
       ========================================================================== */

    async getDepartments(onlyActive = false) {
        await this._delay(40);
        const remoteRows = await this._selectRemoteRows('departments');
        let depts = remoteRows === null
            ? (this._read().departments || [])
            : remoteRows.map(row => ({
                id: row.id,
                name: row.name || '',
                description: row.description || '',
                isActive: row.active !== false,
                displayOrder: row.order_index ?? 0,
                createdAt: row.created_at || '',
                updatedAt: row.updated_at || ''
            }));
        if (onlyActive) depts = depts.filter(d => d.isActive);
        return depts.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }

    async getDepartmentById(id) {
        const departments = await this.getDepartments();
        return departments.find(department => department.id === id) || null;
    }

    async createDepartment(data) {
        await this._requirePermission('leaders:write');
        await this._delay();
        if (!data.name || !data.name.trim()) throw new Error('O nome do departamento é obrigatório.');
        const db = this._read();
        db.departments = db.departments || [];
        const allDepts = await this.getDepartments().catch(() => db.departments);
        const exists = allDepts.find(d => d.name.toLowerCase().trim() === data.name.toLowerCase().trim());
        if (exists) throw new Error('Já existe um departamento com este nome.');
        const now = new Date().toISOString();
        const newDept = {
            id: 'dept_' + Date.now(),
            name: data.name.trim(),
            description: (data.description || '').trim(),
            isActive: data.isActive !== false,
            displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) : (allDepts.length + 1),
            createdAt: now,
            updatedAt: now
        };
        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('departments').insert({
                id: newDept.id,
                name: newDept.name,
                description: newDept.description,
                active: newDept.isActive,
                order_index: newDept.displayOrder,
                created_at: newDept.createdAt,
                updated_at: newDept.updatedAt
            });
            if (error) throw new Error(`Não foi possível criar o departamento no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }
        db.departments.push(newDept);
        this._save(db);
        await this.addAuditLog('DEPARTAMENTO_CRIADO', newDept.name, `Departamento "${newDept.name}" cadastrado`);
        return newDept;
    }

    async updateDepartment(id, data) {
        await this._requirePermission('leaders:write');
        await this._delay();
        const db = this._read();
        db.departments = db.departments || [];
        const idx = db.departments.findIndex(d => d.id === id);
        const existing = idx !== -1 ? db.departments[idx] : await this.getDepartmentById(id);
        if (!existing) throw new Error('Departamento não encontrado.');
        const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('departments').upsert({
                id: updated.id,
                name: updated.name,
                description: updated.description || '',
                active: updated.isActive !== false,
                order_index: Number(updated.displayOrder ?? 0),
                created_at: updated.createdAt || new Date().toISOString(),
                updated_at: updated.updatedAt
            }, { onConflict: 'id' });
            if (error) throw new Error(`Não foi possível atualizar o departamento no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }
        if (idx !== -1) {
            db.departments[idx] = updated;
        } else {
            db.departments.push(updated);
        }
        this._save(db);
        await this.addAuditLog('DEPARTAMENTO_ATUALIZADO', updated.name, `Departamento "${updated.name}" atualizado`);
        return updated;
    }

    async deleteDepartment(id) {
        await this._requirePermission('leaders:write');
        await this._delay();
        const db = this._read();
        const dept = (db.departments || []).find(d => d.id === id) || await this.getDepartmentById(id);
        if (!dept) throw new Error('Departamento não encontrado.');
        const linkedLeaders = await this.getLeaders({ departmentId: id }).catch(() => (db.leaders || []).filter(l => l.departmentId === id));
        if (linkedLeaders.length > 0) throw new Error('Este departamento possui líderes vinculados. Reassine-os antes de excluir.');
        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('departments').delete().eq('id', id);
            if (error) throw new Error(`Não foi possível excluir o departamento no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }
        db.departments = (db.departments || []).filter(d => d.id !== id);
        this._save(db);
        await this.addAuditLog('DEPARTAMENTO_EXCLUÍDO', dept.name, `Departamento "${dept.name}" excluído`);
        return true;
    }

    /* ==========================================================================
       LÍDERES
       ========================================================================== */

    async getLeaders(filters = {}) {
        await this._delay(40);
        const remoteRows = await this._selectRemoteRows('leaders');
        let leaders;
        let depts;
        if (remoteRows === null) {
            const db = this._read();
            leaders = db.leaders || [];
            depts = db.departments || [];
        } else {
            depts = await this.getDepartments();
            leaders = remoteRows.map(row => ({
                id: row.id,
                fullName: row.full_name || '',
                departmentId: row.department_id || '',
                departmentName: row.department_name || '',
                roleTitle: row.role_title || '',
                biography: row.biography || '',
                photoPath: row.photo_url || '',
                instagramUrl: row.instagram_url || '',
                displayOrder: row.order_index ?? 999,
                isActive: row.active !== false,
                isPublished: row.published !== false,
                createdAt: row.created_at || '',
                updatedAt: row.updated_at || ''
            }));
        }

        // Enrich with department name
        leaders = leaders.map(l => ({
            ...l,
            departmentName: (depts.find(d => d.id === l.departmentId) || {}).name || l.departmentName || '—'
        }));

        if (filters.onlyPublished) leaders = leaders.filter(l => l.isPublished && l.isActive);
        if (filters.departmentId) leaders = leaders.filter(l => l.departmentId === filters.departmentId);
        if (filters.status === 'active') leaders = leaders.filter(l => l.isActive);
        if (filters.status === 'inactive') leaders = leaders.filter(l => !l.isActive);
        if (filters.status === 'published') leaders = leaders.filter(l => l.isPublished);
        if (filters.status === 'draft') leaders = leaders.filter(l => !l.isPublished);
        if (filters.search) {
            const q = filters.search.toLowerCase();
            leaders = leaders.filter(l => l.fullName.toLowerCase().includes(q) || l.departmentName.toLowerCase().includes(q));
        }

        // Sort by displayOrder then name
        return leaders.sort((a, b) => {
            const oa = a.displayOrder ?? 999;
            const ob = b.displayOrder ?? 999;
            if (oa !== ob) return oa - ob;
            return a.fullName.localeCompare(b.fullName, 'pt-BR');
        });
    }

    async getLeaderById(id) {
        const leader = (await this.getLeaders()).find(item => item.id === id);
        return leader || null;
    }

    async createLeader(data) {
        await this._requirePermission('leaders:write');
        await this._delay();
        if (!data.fullName || !data.fullName.trim()) throw new Error('O nome completo é obrigatório.');
        if (!data.departmentId) throw new Error('O departamento é obrigatório.');
        if (!data.biography || !data.biography.trim()) throw new Error('A apresentação é obrigatória.');
        const now = new Date().toISOString();
        const dept = await this.getDepartmentById(data.departmentId).catch(() => null);
        const newLeader = {
            id: 'leader_' + Date.now(),
            fullName: data.fullName.trim(),
            departmentId: data.departmentId,
            departmentName: dept?.name || data.departmentName || '',
            roleTitle: (data.roleTitle || '').trim(),
            biography: data.biography.trim(),
            photoPath: data.photoPath || '',
            instagramUrl: (data.instagramUrl || '').trim(),
            displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) : 999,
            isActive: data.isActive !== false,
            isPublished: data.isPublished === true,
            createdAt: now,
            updatedAt: now
        };
        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('leaders').insert({
                id: newLeader.id,
                full_name: newLeader.fullName,
                department_id: newLeader.departmentId,
                department_name: newLeader.departmentName,
                role_title: newLeader.roleTitle,
                biography: newLeader.biography,
                photo_url: newLeader.photoPath,
                instagram_url: newLeader.instagramUrl,
                order_index: newLeader.displayOrder,
                active: newLeader.isActive,
                published: newLeader.isPublished,
                created_at: newLeader.createdAt,
                updated_at: newLeader.updatedAt
            });
            if (error) throw new Error(`Não foi possível cadastrar o líder no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }
        const db = this._read();
        db.leaders = db.leaders || [];
        db.leaders.push(newLeader);
        this._save(db);
        await this.addAuditLog('LÍDER_CRIADO', newLeader.fullName, `Líder "${newLeader.fullName}" cadastrado`);
        return newLeader;
    }

    async updateLeader(id, data) {
        await this._requirePermission('leaders:write');
        await this._delay();
        const db = this._read();
        db.leaders = db.leaders || [];
        const idx = db.leaders.findIndex(l => l.id === id);
        const existing = idx !== -1 ? db.leaders[idx] : await this.getLeaderById(id);
        if (!existing) throw new Error('Líder não encontrado.');
        const cleanData = { ...data };
        Object.keys(cleanData).forEach(k => { if (cleanData[k] === undefined) delete cleanData[k]; });
        const dept = cleanData.departmentId
            ? await this.getDepartmentById(cleanData.departmentId).catch(() => null)
            : null;
        const updated = {
            ...existing,
            ...cleanData,
            departmentName: dept?.name || cleanData.departmentName || existing.departmentName || '',
            displayOrder: cleanData.displayOrder !== undefined ? Number(cleanData.displayOrder) : existing.displayOrder,
            updatedAt: new Date().toISOString()
        };
        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('leaders').upsert({
                id: updated.id,
                full_name: updated.fullName,
                department_id: updated.departmentId,
                department_name: updated.departmentName,
                role_title: updated.roleTitle || '',
                biography: updated.biography || '',
                photo_url: updated.photoPath || '',
                instagram_url: updated.instagramUrl || '',
                order_index: Number(updated.displayOrder ?? 999),
                active: updated.isActive !== false,
                published: Boolean(updated.isPublished),
                created_at: updated.createdAt || new Date().toISOString(),
                updated_at: updated.updatedAt
            }, { onConflict: 'id' });
            if (error) throw new Error(`Não foi possível atualizar o líder no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }
        if (idx !== -1) {
            db.leaders[idx] = updated;
        } else {
            db.leaders.push(updated);
        }
        this._save(db);
        await this.addAuditLog('LÍDER_ATUALIZADO', updated.fullName, `Líder "${updated.fullName}" atualizado`);
        return updated;
    }

    async toggleLeaderPublish(id) {
        await this._requirePermission('leaders:write');
        const db = this._read();
        const idx = (db.leaders || []).findIndex(l => l.id === id);
        const leader = idx !== -1 ? db.leaders[idx] : await this.getLeaderById(id);
        if (!leader) throw new Error('Líder não encontrado.');
        const nextPublished = !leader.isPublished;
        const updated = await this.updateLeader(id, { isPublished: nextPublished });
        const action = updated.isPublished ? 'LÍDER_PUBLICADO' : 'LÍDER_DESPUBLICADO';
        await this.addAuditLog(action, updated.fullName, `Status de publicação alterado para "${updated.isPublished ? 'Publicado' : 'Rascunho'}"`);
        return updated;
    }

    async deleteLeader(id) {
        await this._requirePermission('leaders:write');
        await this._delay();
        const db = this._read();
        const leader = (db.leaders || []).find(l => l.id === id) || await this.getLeaderById(id);
        if (!leader) throw new Error('Líder não encontrado.');
        if (this._hasRemoteDataSource()) {
            const { error } = await this.supabase.from('leaders').delete().eq('id', id);
            if (error) throw new Error(`Não foi possível excluir o líder no Supabase: ${error.message || 'Erro de permissão/banco'}`);
        }
        db.leaders = (db.leaders || []).filter(l => l.id !== id);
        this._save(db);
        await this.addAuditLog('LÍDER_EXCLUÍDO', leader.fullName, `Líder "${leader.fullName}" excluído do sistema`);
        return true;
    }

    /** Retorna líderes publicados e ativos para exibição no site público */
    async getPublicLeaders() {
        return this.getLeaders({ onlyPublished: true });
    }

    /* ==========================================================================
       13. TESTEMUNHOS — GALERIA DE VÍDEOS
       ========================================================================== */

    _normalizeTestimonial(row) {
        if (!row || typeof row !== 'object') return null;
        const isPublished = row.status === 'published'
            ? true
            : (row.status === 'draft' ? false : (row.published !== undefined ? Boolean(row.published) : Boolean(row.isPublished !== false)));
        const status = isPublished ? 'published' : 'draft';
        const videoUrl = (row.videoUrl || row.video_url || '').trim();
        let thumbnailUrl = (row.thumbnailUrl || row.thumbnail_url || '').trim();

        // Gera capa automática para vídeos do YouTube quando não houver thumbnail personalizada
        if (!thumbnailUrl && videoUrl) {
            const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
            if (ytMatch && ytMatch[1]) {
                thumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
            }
        }

        const personName = (row.personName || row.person_name || row.name || '').trim();
        const displayOrder = Number.isFinite(Number(row.displayOrder ?? row.order_index))
            ? Number(row.displayOrder ?? row.order_index)
            : 999;

        return {
            id: String(row.id || `test_${Date.now()}`),
            title: (row.title || '').trim(),
            personName,
            name: personName,
            description: (row.description || '').trim(),
            videoUrl,
            thumbnailUrl,
            status,
            isPublished,
            isActive: row.active !== undefined ? Boolean(row.active) : (row.isActive !== false),
            displayOrder,
            createdAt: row.createdAt || row.created_at || new Date().toISOString(),
            updatedAt: row.updatedAt || row.updated_at || new Date().toISOString()
        };
    }

    async _syncTestimonialRemote(action, payload) {
        if (!this._hasRemoteDataSource()) return false;
        try {
            if (action === 'upsert') {
                const row = {
                    id: payload.id,
                    title: payload.title,
                    person_name: payload.personName,
                    description: payload.description || '',
                    video_url: payload.videoUrl,
                    thumbnail_url: payload.thumbnailUrl || '',
                    status: payload.isPublished ? 'published' : 'draft',
                    published: Boolean(payload.isPublished),
                    active: payload.isActive !== false,
                    order_index: Number(payload.displayOrder || 1),
                    created_at: payload.createdAt,
                    updated_at: payload.updatedAt
                };
                const { error } = await this.supabase.from('testimonials').upsert(row, { onConflict: 'id' });
                if (error) return false;
                return true;
            }
            if (action === 'delete') {
                const { error } = await this.supabase.from('testimonials').delete().eq('id', payload.id);
                if (error) return false;
                return true;
            }
        } catch {
            return false;
        }
        return false;
    }

    async getTestimonials(filters = {}) {
        await this._delay(40);
        const db = this._read();
        const localItems = Array.isArray(db.testimonials) ? db.testimonials : [];
        let items = localItems.map(item => this._normalizeTestimonial(item)).filter(Boolean);

        if (this._hasRemoteDataSource()) {
            try {
                const { data, error } = await this.supabase.from('testimonials').select('*');
                if (!error && Array.isArray(data)) {
                    const remoteItems = data.map(row => this._normalizeTestimonial(row)).filter(Boolean);
                    if (remoteItems.length > 0) {
                        const mergedMap = new Map();
                        remoteItems.forEach(item => mergedMap.set(item.id, item));
                        items.forEach(item => {
                            if (!mergedMap.has(item.id)) mergedMap.set(item.id, item);
                        });
                        items = Array.from(mergedMap.values());
                    }
                }
            } catch {
                // Mantém leitura local caso a tabela remota ainda não tenha sido aplicada
            }
        }

        if (filters.onlyPublished) {
            items = items.filter(t => t.isPublished && t.isActive !== false);
        }
        if (filters.status === 'published') {
            items = items.filter(t => t.isPublished);
        } else if (filters.status === 'draft') {
            items = items.filter(t => !t.isPublished);
        }
        if (filters.search) {
            const q = filters.search.trim().toLowerCase();
            if (q) {
                items = items.filter(t =>
                    t.title.toLowerCase().includes(q) ||
                    t.personName.toLowerCase().includes(q) ||
                    (t.description && t.description.toLowerCase().includes(q))
                );
            }
        }

        return items.sort((a, b) => {
            const oa = a.displayOrder ?? 999;
            const ob = b.displayOrder ?? 999;
            if (oa !== ob) return oa - ob;
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
    }

    async getPublicTestimonials() {
        return this.getTestimonials({ onlyPublished: true });
    }

    async getTestimonialById(id) {
        const list = await this.getTestimonials();
        return list.find(item => item.id === id) || null;
    }

    async createTestimonial(data) {
        await this._requirePermission('testimonials:write');
        await this._delay();

        const title = (data?.title || '').trim();
        const personName = (data?.personName || data?.name || '').trim();
        const videoUrl = (data?.videoUrl || '').trim();
        const description = (data?.description || '').trim();

        if (!title) throw new Error('O título do testemunho é obrigatório.');
        if (!personName) throw new Error('O nome da pessoa é obrigatório.');
        if (!videoUrl) throw new Error('O vídeo do testemunho é obrigatório.');

        const isPublished = data.status
            ? data.status === 'published'
            : (data.isPublished !== false);
        const now = new Date().toISOString();

        const normalized = this._normalizeTestimonial({
            id: 'test_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            title,
            personName,
            description,
            videoUrl,
            thumbnailUrl: (data.thumbnailUrl || '').trim(),
            status: isPublished ? 'published' : 'draft',
            isPublished,
            isActive: true,
            displayOrder: data.displayOrder !== undefined && data.displayOrder !== '' ? Number(data.displayOrder) : 1,
            createdAt: now,
            updatedAt: now
        });

        const db = this._read();
        db.testimonials = Array.isArray(db.testimonials) ? db.testimonials : [];
        db.testimonials.push(normalized);
        this._save(db);
        await this._syncTestimonialRemote('upsert', normalized);

        await this.addAuditLog(
            'TESTEMUNHO_CRIADO',
            `${normalized.title} (${normalized.personName})`,
            `Testemunho cadastrado com status "${normalized.isPublished ? 'Publicado' : 'Rascunho'}" (Ordem: ${normalized.displayOrder})`
        );
        return normalized;
    }

    async updateTestimonial(id, data) {
        await this._requirePermission('testimonials:write');
        await this._delay();

        const db = this._read();
        db.testimonials = Array.isArray(db.testimonials) ? db.testimonials : [];
        let idx = db.testimonials.findIndex(t => t.id === id);

        let existingItem = idx !== -1 ? db.testimonials[idx] : await this.getTestimonialById(id);
        if (!existingItem) throw new Error('Testemunho não encontrado.');

        const title = data.title !== undefined ? String(data.title).trim() : existingItem.title;
        const personName = (data.personName !== undefined || data.name !== undefined)
            ? String(data.personName ?? data.name).trim()
            : existingItem.personName;
        const videoUrl = data.videoUrl !== undefined ? String(data.videoUrl).trim() : existingItem.videoUrl;
        const description = data.description !== undefined ? String(data.description).trim() : (existingItem.description || '');
        const thumbnailUrl = data.thumbnailUrl !== undefined ? String(data.thumbnailUrl).trim() : (existingItem.thumbnailUrl || '');

        if (!title) throw new Error('O título do testemunho é obrigatório.');
        if (!personName) throw new Error('O nome da pessoa é obrigatório.');
        if (!videoUrl) throw new Error('O vídeo do testemunho é obrigatório.');

        const isPublished = data.status !== undefined
            ? data.status === 'published'
            : (data.isPublished !== undefined ? Boolean(data.isPublished) : Boolean(existingItem.isPublished));

        const displayOrder = data.displayOrder !== undefined && data.displayOrder !== ''
            ? Number(data.displayOrder)
            : Number(existingItem.displayOrder || 1);

        const updated = this._normalizeTestimonial({
            ...existingItem,
            id,
            title,
            personName,
            description,
            videoUrl,
            thumbnailUrl,
            status: isPublished ? 'published' : 'draft',
            isPublished,
            displayOrder,
            updatedAt: new Date().toISOString()
        });

        if (idx !== -1) {
            db.testimonials[idx] = updated;
        } else {
            db.testimonials.push(updated);
        }
        this._save(db);
        await this._syncTestimonialRemote('upsert', updated);

        await this.addAuditLog(
            'TESTEMUNHO_ATUALIZADO',
            `${updated.title} (${updated.personName})`,
            `Testemunho atualizado (Ordem: ${updated.displayOrder}, Status: ${updated.isPublished ? 'Publicado' : 'Rascunho'})`
        );
        return updated;
    }

    async toggleTestimonialPublish(id) {
        await this._requirePermission('testimonials:write');
        const existing = await this.getTestimonialById(id);
        if (!existing) throw new Error('Testemunho não encontrado.');
        const nextPublished = !existing.isPublished;
        const updated = await this.updateTestimonial(id, {
            isPublished: nextPublished,
            status: nextPublished ? 'published' : 'draft'
        });
        const action = updated.isPublished ? 'TESTEMUNHO_PUBLICADO' : 'TESTEMUNHO_DESPUBLICADO';
        await this.addAuditLog(
            action,
            `${updated.title} (${updated.personName})`,
            `Status de publicação alterado para "${updated.isPublished ? 'Publicado' : 'Rascunho'}"`
        );
        return updated;
    }

    async deleteTestimonial(id) {
        await this._requirePermission('testimonials:write');
        await this._delay();
        const existing = await this.getTestimonialById(id);
        if (!existing) throw new Error('Testemunho não encontrado.');

        const db = this._read();
        db.testimonials = (db.testimonials || []).filter(t => t.id !== id);
        this._save(db);
        await this._syncTestimonialRemote('delete', { id });

        await this.addAuditLog(
            'TESTEMUNHO_EXCLUÍDO',
            `${existing.title} (${existing.personName})`,
            `Testemunho de "${existing.personName}" excluído do sistema`
        );
        return true;
    }
}

// Instância global disponível como window.db
if (typeof window !== 'undefined') {
    window.db = new DatabaseService();
}

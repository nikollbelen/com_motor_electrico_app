/**
 * DataEngine.js
 * Lógica pura para manipular la jerarquía del info.json
 */

export const DataEngine = {

    /**
     * Convierte el info.json (que tiene una estructura mixta de menu y children)
     * en un árbol plano de nodos que D3.js puede entender.
     */
    normalize: (raw) => {
        if (!raw || !raw.menu) return { id: 'root', name: 'Error' };

        const transform = (item) => {
            const nodeName = item.ESdescription || item.id || item.nombre || "Sin nombre";
            return {
                ...item,
                name: nodeName,
                children: (item.children || []).map(transform)
            };
        };

        // El nodo raíz ahora lleva los datos globales
        return {
            id: 'root',
            name: raw.laboratorio || "Laboratorio",
            nameEN: raw.laboratorioEN || "",
            isRoot: true,
            // Copiar datos globales para el editor
            imageUrl: raw.imageUrl,
            backgroundColor: raw.backgroundColor,
            themeColor: raw.themeColor,
            backgroundType: raw.backgroundType || (raw.imageUrl ? 'image' : 'color'),
            logoUrl: raw.logoUrl,
            menuIconImage: raw.menuIconImage,
            ayudas: raw.ayudas,
            inicioEstado: raw.inicioEstado,
            camaraZoomMax: raw.camaraZoomMax ?? 15000,
            objetos_cristal: raw.objetos_cristal || [],
            objetivos: raw.objetivos || [],
            epp: raw.epp || [],
            children: raw.menu.map(transform)
        };
    },

    reconstruct: (tree, originalConfig) => {
        const cleanNode = (node) => {
            const { name, nameEN, children, depth, x, y, x0, y0, parent, isRoot, ...rest } = node;
            const newNode = { ...rest };
            if (children && children.length > 0) {
                newNode.children = children.map(cleanNode);
            }
            return newNode;
        };

        return {
            ...originalConfig,
            laboratorio: tree.name,
            laboratorioEN: tree.nameEN,
            imageUrl: tree.backgroundType === 'image' ? tree.imageUrl : "",
            backgroundColor: tree.backgroundColor,
            themeColor: tree.themeColor,
            backgroundType: tree.backgroundType,
            logoUrl: tree.logoUrl,
            menuIconImage: tree.menuIconImage,
            ayudas: tree.ayudas,
            inicioEstado: tree.inicioEstado,
            camaraZoomMax: tree.camaraZoomMax ?? 15000,
            objetos_cristal: tree.objetos_cristal || [],
            objetivos: tree.objetivos,
            epp: tree.epp,
            menu: tree.children.map(cleanNode)
        };
    },

    /**
     * Busca el padre de un nodo específico en el árbol.
     */
    findParent: (node, targetId) => {
        if (!node.children) return null;
        for (const child of node.children) {
            if (child.id === targetId) return node;
            const found = DataEngine.findParent(child, targetId);
            if (found) return found;
        }
        return null;
    },

    /**
     * Busca un nodo por su ID.
     */
    findNode: (node, targetId) => {
        if (node.id === targetId) return node;
        if (!node.children) return null;
        for (const child of node.children) {
            const found = DataEngine.findNode(child, targetId);
            if (found) return found;
        }
        return null;
    }
};

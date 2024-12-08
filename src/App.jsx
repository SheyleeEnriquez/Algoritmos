import React, { useState, useMemo, useCallback } from 'react';
import ReactFlow,
{
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionLineType,
  Handle,
  Position
}
from 'reactflow';
import 'reactflow/dist/style.css';

const CustomNode = React.memo(({ data, isConnectable }) => {
  return (
    <div
      style={{
        padding: '10px',
        border: '1px solid black',
        borderRadius: '90px',
        backgroundColor: data.type === 'max' ? '#fff' : '#fff',
        minWidth: '50px',
        textAlign: 'center',
        opacity: data.pruned ? 0.5 : 1
      }}
    >
      {data.label}
      {data.alpha !== undefined && (
        <div style={{ fontSize: '12px', color: 'green' }}>α: {data.alpha}</div>
      )}
      {data.beta !== undefined && (
        <div style={{ fontSize: '12px', color: 'brown' }}>β: {data.beta}</div>
      )}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
    </div>
  );
});

const Busquedas = () => {
  const [treeDepth, setTreeDepth] = useState(3);
  const [nodesPerLevel, setNodesPerLevel] = useState([2, 2]);
  const [leafValues, setLeafValues] = useState('');
  const [algorithmType, setAlgorithmType] = useState('minimax');
  const [speed, setSpeed] = useState(500);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const clearCalculatedValues = () => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          label: 'Nodo por calcular',
          alpha: undefined,
          beta: undefined,
          pruned: false,
        },
      }))
    );
  };

  const nodeTypes = useMemo(() => ({
    custom: CustomNode
  }), []);
  const resetTree = () => {
    setNodes([]);
    setEdges([]);
  };

  const generateTree = () => {
    const generatedNodes = [];
    const leafValuesArray = leafValues.trim() ?
      leafValues.split(',').map(val => parseFloat(val.trim())) :
      [];

    if (leafValuesArray.some(isNaN)) {
      alert('Los valores deben ser números válidos.');
      return;
    }

    const totalLeafNodes = leafValuesArray.length;
    let nodeId = 0;

    for (let level = 0; level < treeDepth - 1; level++) {
      const nodesInThisLevel = nodesPerLevel[level] || 2;

      for (let i = 0; i < nodesInThisLevel; i++) {
        generatedNodes.push({
          id: `node-${nodeId}`,
          type: 'custom',
          position: {
            x: (i * 200) - (nodesInThisLevel * 100 / 2),
            y: level * 100
          },
          data: {
            label: 'Nodo por calcular',
            type: level % 2 === 0 ? 'max' : 'min',
            alpha: undefined,
            beta: undefined,
            pruned: false
          }
        });
        nodeId++;
      }
    }

    const rootNode = {
      id: `node-root`,
      type: 'custom',
      position: { x: 0, y: -100 },
      data: {
        label: 'Nodo por calcular',
        type: 'max',
        alpha: undefined,
        beta: undefined,
        pruned: false
      }
    };
    generatedNodes.unshift(rootNode);

    const lastLevelY = (treeDepth - 1) * 100;
    for (let i = 0; i < totalLeafNodes; i++) {
      const leafValue = leafValuesArray[i];
      generatedNodes.push({
        id: `node-${nodeId}`,
        type: 'custom',
        position: {
          x: (i * 200) - (totalLeafNodes * 100 / 2),
          y: lastLevelY
        },
        data: {
          label: leafValue !== undefined ? leafValue.toString() : 'Nodo por calcular',
          type: 'leaf',
          alpha: undefined,
          beta: undefined,
          pruned: false
        }
      });
      nodeId++;
    }

    setNodes(generatedNodes);
    setEdges([]);
  };

  const handleNodesPerLevelChange = (index, value) => {
    const updatedNodesPerLevel = [...nodesPerLevel];
    updatedNodesPerLevel[index] = Number(value);
    setNodesPerLevel(updatedNodesPerLevel);
  };

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({
      ...params,
      type: ConnectionLineType.Straight,
      animated: true
    }, eds));
  }, []);

  const updateNodeValue = async (node, value) => {
    const updatedNode = { ...node, data: { ...node.data, label: value.toString() } };
    setNodes((nds) => nds.map((n) => (n.id === node.id ? updatedNode : n)));
  };

  const runAlgorithm = () => {
    algorithmType === 'minimax' ? runMinimax() : runAlphaBeta();
  };

  const runMinimax = async () => {
    clearCalculatedValues();
    const newNodes = [...nodes];

    const minimax = (node, depth, isMaximizingPlayer) => {

      if (depth === treeDepth) {
        const leafValue = parseFloat(node.data.label);
        return !isNaN(leafValue) ? leafValue : 0;
      }

      const childEdges = edges.filter(edge => edge.source === node.id);
      let childNodes = childEdges.map(edge => newNodes.find(n => n.id === edge.target));

      childNodes = childNodes.sort((a, b) => a.position.x - b.position.x);

      if (childNodes.length === 0) {
        return 0;
      }

      let value = isMaximizingPlayer ? -Infinity : Infinity;

      for (const child of childNodes) {
        const childValue = minimax(child, depth + 1, !isMaximizingPlayer);

        if (isMaximizingPlayer) {
          value = Math.max(value, childValue);
        } else {
          value = Math.min(value, childValue);
        }
      }

      node.data.label = value.toString();
      updateNodeValue(node, value);

      return value;
    };

    const rootNode = newNodes.find(n => n.id === 'node-root');

    const rootValue = minimax(rootNode, 0, true);

    rootNode.data.label = rootValue.toString();
    await updateNodeValue(rootNode, rootValue);

    setNodes(newNodes);
  };

  const runAlphaBeta = async () => {
    clearCalculatedValues();
    const newNodes = [...nodes];

    const alphaBetaPruning = (node, depth, isMaximizingPlayer, alpha, beta) => {
      if (depth === treeDepth) {
        const leafValue = parseFloat(node.data.label);
        return !isNaN(leafValue) ? leafValue : 0;
      }

      const childEdges = edges.filter(edge => edge.source === node.id);
      let childNodes = childEdges.map(edge => newNodes.find(n => n.id === edge.target));

      childNodes = childNodes.sort((a, b) => a.position.x - b.position.x);

      if (childNodes.length === 0) {
        return 0;
      }

      let value = isMaximizingPlayer ? -Infinity : Infinity;
      let bestNode = null;

      for (const child of childNodes) {
        const childValue = alphaBetaPruning(child, depth + 1, !isMaximizingPlayer, alpha, beta);

        if (isMaximizingPlayer) {
          if (childValue > value) {
            value = childValue;
            bestNode = child;
          }
          alpha = Math.max(alpha, value);
        } else {
          if (childValue < value) {
            value = childValue;
            bestNode = child;
          }
          beta = Math.min(beta, value);
        }

        if (beta <= alpha) {
          childNodes.forEach(n => {
            if (n !== bestNode) {
              n.data.pruned = true;
              n.data.label = 'Podado';
            }
          });
          break;
        }
      }

      if (bestNode) {
        node.data.label = value.toString();
        updateAlphaBetaValues(node, alpha, beta);
        updateNodeValue(node, value);
      }

      return value;
    };


    const rootNode = newNodes.find(n => n.id === 'node-root');
    const rootValue = alphaBetaPruning(
      rootNode,
      0,
      true,
      -Infinity,
      Infinity
    );

    rootNode.data.label = rootValue.toString();
    await updateNodeValue(rootNode, rootValue);

    setNodes(newNodes);
  };

  const updateAlphaBetaValues = async (node, alpha, beta) => {
    node.data.alpha = alpha !== undefined ? alpha.toString() : '-∞';
    node.data.beta = beta !== undefined ? beta.toString() : '∞';
    await updateNodeValue(node, node.data.label);

    const nodeElement = document.getElementById(node.id);
    if (nodeElement) {
      const alphaBetaDisplay = nodeElement.querySelector('.alpha-beta');
      if (alphaBetaDisplay) {
        alphaBetaDisplay.innerText = `α: ${node.data.alpha}, β: ${node.data.beta}`;
      }
    }
  };

  return (
    <div style={{ height: '715px', width: '100%', display: 'flex' }}>
      <div style={{
        width: '300px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '20px',
        borderRight: '1px solid #333',
        overflowY: 'auto',
        backgroundColor: '#f8f8f8',
        fontFamily: 'Arial, serif'
      }}>
        <p>Ingresa el valor de la profundidad del árbol restando 1:</p>
        <input
          type="number"
          placeholder="Profundidad"
          value={treeDepth}
          onChange={(e) => setTreeDepth(Number(e.target.value))}
        />

        {Array.from({ length: treeDepth - 1 }).map((_, index) => (
          <>
            <p key={index}>Ingresa el número de nodos en el nivel {index + 1}:</p>
            <input
              type="number"
              placeholder={`Nodos ${index + 1}`}
              value={nodesPerLevel[index] || ''}
              onChange={(e) => handleNodesPerLevelChange(index, e.target.value)}
            />
          </>
        ))}

        <p>Ingresa los valores de los nodos del último nivel (Ejemplo: 1, 2, 3):</p>
        <input
          type="text"
          placeholder="Valores del último nivel"
          value={leafValues}
          onChange={(e) => setLeafValues(e.target.value)}
        />

        <button
          onClick={generateTree}
          style={{
            backgroundColor: '#c8d8f2',
            color: 'black',
            border: 'none',
            padding: '10px 20px',
            fontSize: '14px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '10px',
            fontFamily: 'Arial, serif'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#97b6e7'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#c8d8f2'}
        >
          Dibujar
        </button>

        <button
          onClick={resetTree}
          style={{
            backgroundColor: '#FFABAB',
            color: 'black',
            border: 'none',
            padding: '10px 20px',
            fontSize: '14px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontFamily: 'Arial, serif'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#FF8A8A'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#FFABAB'}
        >
          Limpiar
        </button>

        <p>Selecciona el tipo de algoritmo:</p>
        <select
          onChange={(e) => setAlgorithmType(e.target.value)}
          value={algorithmType}
          style={{
            fontFamily: 'Arial',
            fontSize: '14px',
          }}
        >
          <option value="minimax">Minimax</option>
          <option value="alphabeta">Poda Alpha-Beta</option>
        </select>


        <button onClick={runAlgorithm}
          style={{
            backgroundColor: '#c3e1be',
            color: 'black',
            border: 'none',
            padding: '10px 20px',
            fontSize: '14px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontFamily: 'Arial, serif'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#a7d89f'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#c3e1be'}
        >Ejecutar</button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        style={{ flex: 1 }}
      >
        <Controls />
        <Background style={{ backgroundColor: '#e4eef1' }} />
      </ReactFlow>
    </div>
  );
};

export default Busquedas;
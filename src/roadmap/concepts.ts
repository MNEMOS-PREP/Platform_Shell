/**
 * Every concept in DSA, by topic and group: what the route map is made of.
 *
 * Written compactly: a group is `name`, then its concepts separated by `|`, each with a level after `~`
 * (b basic, c core, a advanced; core when omitted). The route order is the teaching order, and a stop's ids are
 * the M04 ontology's where the ontology has one, so M05 questions and M06 interviews can be fetched by the same key.
 *
 * Basic and core concepts are what a stop needs to be covered; advanced ones are there to go further and never
 * hold the next stop shut.
 */

export type Level = "basic" | "core" | "advanced";

export interface Concept {
  name: string;
  level: Level;
}

export interface Group {
  name: string;
  concepts: Concept[];
}

export interface Topic {
  id: string;
  name: string;
  route: string;
  groups: Group[];
}

export interface RouteDef {
  id: string;
  name: string;
  topics: Topic[];
}

const LEVELS: Record<string, Level> = { b: "basic", c: "core", a: "advanced" };

function g(name: string, s: string): Group {
  return {
    name,
    concepts: s.split("|").map((x) => {
      const [n, l] = x.split("~");
      return { name: n.trim(), level: LEVELS[l ?? "c"] };
    }),
  };
}

type Raw = [string, string, Group[]];

const raw = (route: string, topics: Raw[]): RouteDef => ({
  id: route.toLowerCase().replace(/[^a-z]+/g, "_"),
  name: route,
  topics: topics.map(([id, name, groups]) => ({ id, name, route, groups })),
});

export const ROUTE_DEFS: RouteDef[] = [
  raw("Foundations", [
    ["arrays", "Arrays", [
      g("Basics", "Memory layout and contiguity~b|Index access in O(1)~b|Static vs dynamic arrays~b|Insertion and deletion cost~b|Traversal and reversal~b|Rotate an array~c|In-place rearrangement~c"),
      g("Dynamic arrays", "Resizing and growth factor~c|Amortised append~c|Capacity vs size~b|Shrinking policy~a"),
      g("Multi-dimensional", "Row-major vs column-major~c|Matrix traversal: spiral, diagonal~c|Transpose and rotate a matrix~c|Sparse matrices~c|Cache locality~a"),
      g("Classic problems", "Merge two sorted arrays~b|Kadane: maximum subarray~c|Dutch national flag~c|Majority element: Boyer-Moore~c|Missing and duplicate number~c|Product of array except self~c|Merge and insert intervals~c|Next permutation~a|Trapping rain water~a"),
    ]],
    ["strings", "Strings", [
      g("Basics", "Character encodings: ASCII, Unicode~b|Immutability~b|Concatenation cost and builders~b|Lexicographic comparison~b"),
      g("Operations", "Reverse and palindrome check~b|Anagram check~b|Parsing numbers: atoi~c|Run-length encoding~c|Longest common prefix~c"),
      g("Pattern matching", "Brute force~b|KMP and the prefix function~c|Rabin-Karp rolling hash~c|Z-algorithm~a|Boyer-Moore~a|Aho-Corasick~a"),
      g("Advanced", "Longest palindromic substring~c|Manacher~a|String hashing~c|Suffix array and LCP~a|Suffix tree~a"),
    ]],
    ["time_complexity", "Complexity", [
      g("Notation", "Big-O, Omega, Theta~b|Growth-rate ladder: 1, log n, n, n log n, n squared, 2^n, n!~b|Dropping constants and lower terms~b|Little-o and little-omega~a"),
      g("Cases and analysis", "Best, worst and average case~b|Space and auxiliary space~b|Amortised analysis: aggregate, accounting, potential~a|Expected time of randomised algorithms~a"),
      g("Recurrences", "Substitution method~c|Recursion tree~c|Master theorem~c|Akra-Bazzi~a"),
      g("In practice", "Analysing loops~b|Nested and dependent loops~c|Recursive complexity~c|Empirical measurement~c|Input size to algorithm choice~c|Comparison-sort lower bound~a"),
    ]],
    ["hashing", "Hashing", [
      g("Foundations", "Hash function properties~b|Direct addressing~b|Load factor~b|Universal hashing~a"),
      g("Collision handling", "Chaining~b|Linear probing~c|Quadratic probing~c|Double hashing~c|Rehashing~c|Cuckoo and Robin Hood hashing~a"),
      g("Abstract types", "Set~b|Map and dictionary~b|Multiset and counter~b|Ordered map and LinkedHashMap~c"),
      g("Patterns", "Frequency counting~b|Two-sum with a map~b|Group anagrams~c|Subarray sum with a prefix map~c|Longest consecutive sequence~c|LRU cache~a"),
      g("Probabilistic", "Bloom filter~a|Count-min sketch~a|Consistent hashing~a|Perfect hashing~a"),
    ]],
    ["sliding_window", "Two pointers", [
      g("Two pointers", "Opposite ends: two-sum on sorted~b|Same direction: remove duplicates~b|Fast and slow~c|Three-sum and four-sum~c|Merge-style scan~b|Partitioning~c"),
      g("Sliding window", "Fixed-size window~b|Variable-size window~c|Window with a hash map~c|At most k distinct~c|Minimum window substring~a|Window with a monotonic deque~a"),
    ]],
    ["prefix_sums", "Prefix sums", [
      g("One dimension", "Prefix sums~b|Range-sum queries~b|Subarray sum equals k~c|Equilibrium index~c|Prefix XOR and product~c"),
      g("Difference arrays", "Range updates~c|Overlap counting~c|Car pooling and bookings~c"),
      g("Two dimensions", "2D prefix sums~c|Submatrix sum queries~c|Integral image~a"),
    ]],
    ["bit_manipulation", "Bit tricks", [
      g("Basics", "Binary and two's complement~b|AND, OR, XOR, NOT~b|Shifts~b|Set, clear, toggle, test a bit~b"),
      g("Tricks", "Power-of-two check~b|Count set bits: Kernighan~c|Lowest set bit: n and -n~c|XOR to find the single number~c|Swap without a temp~b|Gray code~a"),
      g("Applications", "Bitmask subsets~c|Bitsets~c|Bitmask DP~a|Bitwise trie: maximum XOR~a"),
    ]],
  ]),
  raw("Linear structures", [
    ["stacks", "Stacks", [
      g("Basics", "Stack ADT~b|Array stack~b|Linked stack~b|Overflow and underflow~b"),
      g("Applications", "Balanced parentheses~b|Undo and redo~b|Browser history~b|Infix to postfix~c|Postfix evaluation~c|Call stack and removing recursion~c|DFS with an explicit stack~c"),
      g("Monotonic stack", "Next greater element~c|Daily temperatures~c|Stock span~c|Remove k digits~c|Largest rectangle in a histogram~a"),
      g("Variants", "Min-stack~c|Stack from queues~c|Two stacks in one array~a"),
    ]],
    ["queues", "Queues", [
      g("Basics", "Queue ADT~b|Array queue~b|Circular queue~b|Linked queue~b"),
      g("Variants", "Deque~c|Queue from two stacks~c|Stack from queues~c|Priority queue: see Heaps~c"),
      g("Applications", "Round-robin scheduling~b|Moving average~b|BFS driver~c|Producer-consumer buffer~c|Rate limiter~c|Sliding window maximum~a"),
      g("Advanced", "Monotonic deque~a|Lock-free queues~a"),
    ]],
    ["linked_lists", "Linked lists", [
      g("Basics", "Node and pointer~b|Singly linked list~b|Doubly linked list~b|Circular linked list~b|Insert and delete at head, tail, middle~b|Dummy head~c"),
      g("Techniques", "Reverse: iterative, recursive~b|Middle node~b|Nth from the end~b|Merge two sorted lists~b|Fast and slow pointer~c|Cycle detection and start: Floyd~c|Palindrome list~c|Intersection of two lists~c|Merge sort on a list~c|Reverse in k-groups~a|Copy list with random pointer~a"),
      g("Advanced", "LRU cache: list plus map~c|Skip lists~a|Unrolled linked list~a|XOR linked list~a|Self-organising lists~a"),
    ]],
  ]),
  raw("Search and sort", [
    ["sorting", "Sorting", [
      g("Elementary", "Bubble sort~b|Selection sort~b|Insertion sort~b|Shell sort~a"),
      g("Efficient", "Merge sort~c|Quick sort and partition schemes: Lomuto, Hoare~c|Pivot choice and worst case~c|Heap sort~c|Quickselect~c|Introsort and Timsort~a"),
      g("Non-comparison", "Counting sort~c|Radix sort~c|Bucket sort~c"),
      g("Properties", "Stability~b|In-place~b|Adaptive sorts~c|External sorting~a|Comparison lower bound~a"),
      g("Applications", "Custom comparators~b|Merge intervals~c|Meeting rooms~c|Kth largest~c|Sort colours~c|Count inversions~a"),
    ]],
    ["binary_search", "Binary search", [
      g("Classic", "Iterative and recursive~b|Loop invariants and off-by-one~c|Lower and upper bound~c|First and last occurrence~c"),
      g("Variants", "Rotated sorted array~c|Peak element~c|Search in a 2D matrix~c|Square root and floating point~c|Bitonic array~a"),
      g("On the answer", "Minimum shipping capacity~c|Koko eating bananas~c|Split array largest sum~a|Aggressive cows~a|Median of two sorted arrays~a"),
      g("Related searches", "Exponential search~a|Interpolation search~a|Ternary search~a|Fractional cascading~a"),
    ]],
    ["recursion", "Recursion", [
      g("Fundamentals", "Base case and recursive case~b|Call stack frames~b|Stack overflow~b|Recursion vs iteration~b|Tail recursion~c"),
      g("Patterns", "Linear recursion: factorial, sum~b|Binary recursion: Fibonacci~b|Multiple recursion~c|Mutual recursion~a|Divide the input~c"),
      g("Memoisation", "Overlapping subproblems~c|Top-down caching~c|From Fibonacci to DP~c"),
      g("Enumeration", "Subsets~c|Permutations~c|Combinations~c|Generate parentheses~c|Tower of Hanoi~c|Flood fill~c"),
    ]],
    ["divide_and_conquer", "Divide, conquer", [
      g("Paradigm", "Divide, conquer, combine~b|Recurrence and Master method~c|Compared with dynamic programming~c"),
      g("Classics", "Binary search~b|Fast exponentiation~b|Merge sort~c|Quick sort and quickselect~c|Maximum subarray~c|Karatsuba multiplication~a|Strassen matrix multiplication~a|Closest pair of points~a|Convex hull~a|Counting inversions~a|Median of medians~a|FFT~a"),
    ]],
  ]),
  raw("Trees", [
    ["tree_basics", "Tree basics", [
      g("Terminology", "Root, parent, child, leaf, sibling~b|Ancestor and descendant~b|Depth, height, level~b|Degree and subtree~b"),
      g("Types", "Binary tree~b|Full, complete, perfect~b|Balanced and degenerate~b|N-ary tree and forest~c"),
      g("Representation", "Pointer nodes~b|Array representation~b|Parent array~c|Left-child right-sibling~a"),
      g("Basic operations", "Height and size~b|Count leaves~b|Mirror and invert~b|Same tree and symmetric tree~b|Diameter~c|Check height-balanced~c|Path sum~c|Maximum path sum~a"),
    ]],
    ["tree_traversals", "Traversals", [
      g("Depth-first", "Preorder~b|Inorder~b|Postorder~b|Recursive versions~b|Iterative with a stack~c|Morris traversal~a"),
      g("Breadth-first", "Level order~b|Zigzag order~c|Right-side view~c|Vertical order~c|Boundary traversal~a"),
      g("Reconstruction", "Build from preorder and inorder~c|Build from postorder and inorder~c|Serialise and deserialise~a|Threaded binary trees~a|Euler tour~a"),
    ]],
    ["tree_paths", "LCA and paths", [
      g("Ancestors", "LCA in a binary tree~c|LCA in a BST~c|Binary lifting~a|LCA via Euler tour and RMQ~a|Kth ancestor~a"),
      g("Paths", "Distance between two nodes~c|Root-to-leaf paths~c|Path sum I, II, III~c|Tree diameter by two BFS~c"),
      g("Tree DP and decomposition", "Subtree queries via Euler tour~a|Maximum independent set on a tree~a|Rerooting DP~a|Heavy-light decomposition~a|Centroid decomposition~a"),
    ]],
    ["binary_search_trees", "BST", [
      g("Properties", "Ordering invariant~b|Inorder gives sorted order~b|Height and the degenerate case~b|Average height of a random BST~a"),
      g("Operations", "Search~b|Insert~b|Minimum and maximum~b|Delete: zero, one, two children~c|Successor and predecessor~c|Floor and ceiling~c"),
      g("Problems", "Validate a BST~c|Kth smallest~c|Range sum~c|Two-sum in a BST~c|BST iterator~c|BST from preorder~c|Sorted array or list to BST~c|Recover two swapped nodes~a"),
      g("Extensions", "Order-statistic tree~a"),
    ]],
    ["balanced_trees", "Balanced BSTs", [
      g("Foundations", "Why balance~b|Rotations: left, right, LR, RL~c"),
      g("AVL", "Balance factor~c|AVL insert~c|AVL delete~c"),
      g("Red-black", "Properties~c|Insertion fix-up~a|Deletion fix-up~a|Left-leaning red-black~a"),
      g("Others", "Splay trees~a|Treaps~a|Scapegoat trees~a|AA trees~a|Weight-balanced trees~a|2-3 and 2-3-4 trees~a|Compared with skip lists~a"),
    ]],
    ["heaps", "Heaps", [
      g("Basics", "Complete binary tree~b|Min-heap and max-heap property~b|Array indexing~b"),
      g("Operations", "Insert: sift up~b|Extract: sift down~b|Peek~b|Build-heap in O(n)~c|Decrease-key~c|Delete arbitrary element~c"),
      g("Applications", "Priority queue~b|Heap sort~c|Top-k~c|K-way merge~c|Running median: two heaps~c|Task scheduler~c|Dijkstra and Prim~c|Huffman coding~c"),
      g("Variants", "d-ary heap~a|Binomial heap~a|Fibonacci heap~a|Pairing heap~a|Leftist and skew heaps~a|Indexed priority queue~a"),
    ]],
    ["range_trees", "Range trees", [
      g("Segment tree", "Build~c|Point update~c|Range query: sum, min, max~c|Lazy propagation~a|Persistent segment tree~a|Merge sort tree~a|Segment tree beats~a"),
      g("Fenwick tree", "Point update and prefix query~c|Range update~a|2D Fenwick~a"),
      g("Related", "Sparse table: RMQ~c|Sqrt decomposition~a|Mo's algorithm~a|Interval tree~a|K-d tree~a|Quadtree and octree~a"),
    ]],
    ["tries", "Tries", [
      g("Trie", "Insert, search, startsWith~b|Delete~c|Autocomplete~c|Word search II~a"),
      g("Compressed forms", "Radix and Patricia trie~a|Ternary search tree~a|DAWG~a"),
      g("Related", "Bitwise trie: maximum XOR~a|Suffix trie and suffix tree~a|Aho-Corasick~a|Merkle tree~a"),
    ]],
    ["disk_trees", "Disk-based trees", [
      g("B-trees", "Why databases use B-trees~c|B-tree order and page size~c|B-tree search~c|Insert and node split~a|Delete and merge~a"),
      g("Variants", "B+ tree~c|R-tree~a|LSM tree~a|External memory model~a"),
    ]],
  ]),
  raw("Graphs", [
    ["graphs_representation", "Graph basics", [
      g("Terminology", "Vertex, edge, degree~b|Path and cycle~b|Directed, undirected, weighted~b|DAG, tree, forest~b|Complete, bipartite, planar~c|Simple graph vs multigraph~c"),
      g("Representations", "Adjacency matrix~b|Adjacency list~b|Edge list~b|Incidence matrix~c|Implicit graphs: grids and states~c"),
      g("Properties", "Handshake lemma~c|Density and space trade-offs~c|Building a graph from a problem~c"),
    ]],
    ["graph_traversal_bfs", "BFS", [
      g("Algorithm", "Queue and visited set~b|Distance and level array~b|Parent tracking and path reconstruction~c"),
      g("Applications", "Shortest path, unweighted~b|Connected components~b|Grid and maze shortest path~b|Multi-source BFS~c|Bipartite check~c|Word ladder~c|Rotting oranges~c|0-1 BFS~a|Bidirectional BFS~a|State-space BFS~a"),
    ]],
    ["graph_traversal_dfs", "DFS", [
      g("Algorithm", "Recursive and iterative~b|Discovery and finish times~c|Edge classification~c|DFS tree~c"),
      g("Applications", "Path existence~b|Flood fill and islands~b|Connected components~b|Cycle detection, undirected~c|Cycle detection, directed: colours~c|All paths~c|Clone a graph~c|Course schedule~c|Backtracking on graphs~c"),
    ]],
    ["shortest_paths", "Shortest paths", [
      g("Concepts", "Relaxation~c|Triangle inequality~c|Negative edges and cycles~c"),
      g("Algorithms", "Dijkstra with a heap~c|Bellman-Ford~c|Floyd-Warshall~c|Shortest paths in a DAG~c|SPFA~a|Johnson~a|A-star search~a"),
      g("Applications", "Network delay time~c|Cheapest flights within k stops~c|Path with minimum effort~c|Path reconstruction~c|K shortest paths~a|Bidirectional Dijkstra~a"),
    ]],
    ["minimum_spanning_tree", "MST and union-find", [
      g("Spanning trees", "Cut property and cycle property~c|Kruskal~c|Prim~c|Borůvka~a|Uniqueness~a|Second-best MST~a"),
      g("Union-find", "Make, find, union~c|Path compression~c|Union by rank and size~c|Cycle detection~c|Accounts merge~c|Redundant connection~c|Rollback DSU~a"),
    ]],
    ["topological_sort", "Topological sort", [
      g("Order", "Topological order~b|Kahn: BFS with indegree~c|DFS-based order~c|Cycle detection through topo sort~c"),
      g("Applications", "Course schedule I and II~c|Build order~c|Longest path in a DAG~c|DAG DP~c|Alien dictionary~a|Critical path scheduling~a|Lexicographically smallest order~a"),
    ]],
    ["connectivity", "Connectivity", [
      g("Components", "Strongly connected components~c|Kosaraju~c|Tarjan~a|Condensation DAG~a"),
      g("Cuts", "Bridges~a|Articulation points~a|Biconnected components~a"),
      g("Special walks", "Eulerian path and circuit~a|Hamiltonian path~a|2-SAT~a"),
    ]],
    ["flow_matching", "Flow and matching", [
      g("Flow", "Flow networks~c|Ford-Fulkerson~c|Edmonds-Karp~c|Max-flow min-cut~c|Dinic~a|Min-cost flow~a"),
      g("Matching", "Bipartite matching~c|Hopcroft-Karp~a|Hungarian assignment~a|Hall's theorem~a|Stable marriage~a"),
    ]],
  ]),
  raw("Paradigms", [
    ["greedy", "Greedy", [
      g("Ideas", "Greedy-choice property~c|Optimal substructure~c|Exchange argument~c|When greedy fails~c|Matroids~a"),
      g("Classics", "Activity selection~b|Coin change, canonical~b|Fractional knapsack~c|Job sequencing with deadlines~c|Huffman coding~c|Minimum platforms~c|Gas station~c|Jump game~c|Interval partitioning~c|Task scheduler~c"),
    ]],
    ["dynamic_programming", "Dynamic prog.", [
      g("Foundations", "Optimal substructure~c|Overlapping subproblems~c|State, transition, base case~c|Top-down vs bottom-up~c|Space optimisation~c|Reconstructing the solution~c"),
      g("One dimension", "Climbing stairs~b|House robber~c|Maximum subarray~c|Longest increasing subsequence~c|Coin change: minimum and ways~c|Word break~c|Decode ways~c"),
      g("Grids", "Unique paths~b|Minimum path sum~c|Maximal square~c|Dungeon game~a"),
      g("Strings", "Longest common subsequence~c|Edit distance~c|Longest palindromic subsequence~c|Distinct subsequences~a|Regex and wildcard matching~a|Interleaving strings~a"),
      g("Knapsack family", "0-1 knapsack~c|Unbounded knapsack~c|Subset sum~c|Partition equal subset~c|Target sum~c|Multi-dimensional knapsack~a"),
      g("Intervals", "Matrix chain multiplication~c|Burst balloons~a|Optimal BST~a|Palindrome partitioning~a"),
      g("Advanced", "Stock buy and sell series~c|DP on a DAG~c|DP on trees~a|Bitmask DP and TSP~a|Digit DP~a|Expected-value DP~a|Convex hull trick~a|Divide and conquer optimisation~a|Knuth optimisation~a"),
    ]],
    ["backtracking", "Backtracking", [
      g("Template", "Choose, explore, unchoose~b|Decision tree~b|Pruning and constraint checks~c"),
      g("Problems", "Phone keypad words~b|Subsets~c|Permutations with duplicates~c|Combination sum~c|N-Queens~c|Sudoku~c|Word search~c|Palindrome partitioning~c|Generate parentheses~c|Rat in a maze~c|Graph colouring~c|Hamiltonian path~a"),
      g("Optimising", "Symmetry breaking~a|Memoised backtracking~a|Meet in the middle~a"),
    ]],
    ["branch_and_bound", "Branch and bound", [
      g("Ideas", "Bounding function~c|Live nodes~c|FIFO, LIFO and least-cost search~c|Compared with backtracking~c|Pruning heuristics~a"),
      g("Problems", "0-1 knapsack~c|Assignment problem~c|Travelling salesman~c|15-puzzle~a"),
    ]],
    ["np_hardness", "NP and beyond", [
      g("Classes", "P and NP~c|NP-hard and NP-complete~c|Decision vs optimisation~c|Cook-Levin and SAT~c"),
      g("Reductions", "Polynomial-time reductions~c|3-SAT, Clique, Vertex cover~a|Hamiltonian cycle and TSP~a|Subset sum and knapsack~a"),
      g("Coping", "Approximation algorithms~a|Hill climbing~c|Gradient descent~c|Simulated annealing~a|Randomised algorithms~a|Parameterised complexity~a|Parallel algorithms~a|Heuristic search~a"),
    ]],
  ]),
];

export const TOPICS: Topic[] = ROUTE_DEFS.flatMap((r) => r.topics);

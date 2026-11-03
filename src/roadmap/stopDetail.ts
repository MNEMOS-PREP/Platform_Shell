/**
 * What is inside each stop on the DSA map.
 *
 * - `syllabus`: the topics Amrita's own course text lists for that stop, per programme, with the course and unit
 *   they come from. The wording follows the catalogue's syllabus text (M20 `amrita.json`); nothing is added that
 *   the course does not say. Where a programme's syllabus does not teach a stop there is no entry, and the map
 *   calls it interview prep.
 * - `practice`: the five application-level problems of the practice set, easy to hard. Titles only for now; the
 *   statements, tests and hints belong to the question bank (M05).
 * - `viva`: what the mini interview on the stop asks about, as the questions a panel would open with.
 */
import type { ProgrammeId } from "./rules";

export type Level = "easy" | "medium" | "hard";

export interface SyllabusTopics {
  /** Course and unit, e.g. "23CSE203 · Unit 2". */
  from: string;
  items: string[];
}

export interface StopDetail {
  syllabus: Partial<Record<ProgrammeId, SyllabusTopics[]>>;
  practice: { title: string; level: Level }[];
  viva: string[];
}

const p = (title: string, level: Level) => ({ title, level });

export const DETAIL: Record<string, StopDetail> = {
  bit_manipulation: {
    syllabus: {
      aie: [{ from: "22AIE101 · Unit 2", items: ["Operators and expressions: arithmetic, unary, logical, bit-wise, assignment and conditional operators"] }],
    },
    practice: [
      p("Is this number a power of two?", "easy"),
      p("Count the set bits in an ID", "easy"),
      p("Find the one number that appears once", "medium"),
      p("List every subset of a small set with a mask", "medium"),
      p("Largest XOR of any two numbers in a list", "hard"),
    ],
    viva: [
      "Why does n and (n minus 1) clear the lowest set bit?",
      "How does XOR find the single number in a list of pairs?",
      "When is a bitmask a better set than a hash set?",
    ],
  },
  tree_basics: {
    syllabus: {
      cse: [{ from: "23CSE203 · Unit 2", items: ["Tree definition and properties", "Tree ADT", "Binary tree", "Linked structure for binary tree", "Array based implementation"] }],
      aie: [{ from: "22AIE112 · Unit 4", items: ["Binary tree", "Array and linked list representation", "Complete binary tree"] }],
    },
    practice: [
      p("Count the nodes and leaves of a folder tree", "easy"),
      p("Height of an org chart", "easy"),
      p("Is this tree a mirror of itself?", "medium"),
      p("Diameter of a network of offices", "medium"),
      p("Largest sum along any path in a tree", "hard"),
    ],
    viva: [
      "What is the difference between depth and height?",
      "How many edges does a tree of n nodes have, and why?",
      "How do you store a complete binary tree in an array?",
    ],
  },
  tree_paths: {
    syllabus: {},
    practice: [
      p("Distance between two files in a folder tree", "easy"),
      p("Every path from root to leaf", "easy"),
      p("Lowest common manager of two employees", "medium"),
      p("Paths that add up to a target", "medium"),
      p("Answer many ancestor queries quickly", "hard"),
    ],
    viva: [
      "How do you find the lowest common ancestor in a BST compared with a plain tree?",
      "What does binary lifting precompute?",
      "How would you find the diameter of a tree?",
    ],
  },
  range_trees: {
    syllabus: {
      cse: [{ from: "23CSE203 · Unit 3", items: ["Segment trees"] }],
    },
    practice: [
      p("Sum of a range of sensor readings", "easy"),
      p("Update one reading and re-query", "easy"),
      p("Smallest value in any range", "medium"),
      p("Add to a whole range lazily", "medium"),
      p("Count how many values in a range are below a limit", "hard"),
    ],
    viva: [
      "Why is a segment tree query O(log n)?",
      "Segment tree or Fenwick tree: when does each fit?",
      "What does lazy propagation save?",
    ],
  },
  tries: {
    syllabus: {
      aie: [{ from: "22AIE203 · Unit 3", items: ["Tries and inverted tries", "Radix sort", "Large string structures"] }],
    },
    practice: [
      p("Does this word exist in the dictionary?", "easy"),
      p("Does any word start with this prefix?", "easy"),
      p("Suggest completions as the user types", "medium"),
      p("Longest common prefix of many strings", "medium"),
      p("Find every dictionary word on a letter grid", "hard"),
    ],
    viva: [
      "What does a trie give you that a hash set does not?",
      "What is the memory cost of a trie, and how do you reduce it?",
      "How would you use a trie for maximum XOR?",
    ],
  },
  disk_trees: {
    syllabus: {
      cse: [{ from: "23CSE203 · Unit 3", items: ["B-Trees", "External memory sorting and searching"] }],
    },
    practice: [
      p("How many levels does a B-tree of a million keys need?", "easy"),
      p("Search a B-tree by hand", "easy"),
      p("Insert keys and show each split", "medium"),
      p("Choose the order for a 4 KB page", "medium"),
      p("Design the index for a table of a billion rows", "hard"),
    ],
    viva: [
      "Why do databases use B-trees instead of binary trees?",
      "What is the difference between a B-tree and a B+ tree?",
      "What does a node split do?",
    ],
  },
  connectivity: {
    syllabus: {
      cse: [{ from: "23CSE211 · Unit 1", items: ["Biconnected components and strong connectivity"] }],
    },
    practice: [
      p("Are all cities still connected?", "easy"),
      p("Group mutually reachable web pages", "medium"),
      p("Find the roads whose loss splits the map", "medium"),
      p("Find the servers whose loss splits the network", "hard"),
      p("Walk every road exactly once", "hard"),
    ],
    viva: [
      "What is a strongly connected component?",
      "What is a bridge, and how does DFS find one?",
      "When does an Euler circuit exist?",
    ],
  },
  flow_matching: {
    syllabus: {
      cse: [{ from: "23CSE211 · Unit 3", items: ["Network flow and matching: maximum flow, cuts, maximum bipartite matching"] }],
      aie: [{ from: "22AIE212 · Unit 2", items: ["The maximum-flow problem", "Maximum matching in bipartite graphs", "Stable marriage problem"] }],
    },
    practice: [
      p("Most water through a pipe network", "easy"),
      p("Match students to projects", "medium"),
      p("Smallest cut that disconnects source and sink", "medium"),
      p("Assign jobs to machines at minimum cost", "hard"),
      p("Stable matching of residents to hospitals", "hard"),
    ],
    viva: [
      "What does the max-flow min-cut theorem say?",
      "How does Ford-Fulkerson use residual edges?",
      "How do you turn bipartite matching into a flow problem?",
    ],
  },
  branch_and_bound: {
    syllabus: {
      cse: [{ from: "23CSE211 · Unit 3", items: ["Backtracking and branch and bound", "0-1 knapsack"] }],
      aie: [{ from: "22AIE212 · Unit 3", items: ["Branch and bound: LIFO and FIFO search", "Assignment problem", "Knapsack problem", "Travelling salesman problem"] }],
    },
    practice: [
      p("Bound the best possible value of a partial pack", "easy"),
      p("Solve a small knapsack with pruning", "easy"),
      p("Assign four workers to four jobs", "medium"),
      p("Shortest tour of five cities", "medium"),
      p("Solve the 15-puzzle with a bound", "hard"),
    ],
    viva: [
      "How is branch and bound different from backtracking?",
      "What makes a good bounding function?",
      "FIFO, LIFO or least-cost: how do they differ?",
    ],
  },
  np_hardness: {
    syllabus: {
      cse: [
        { from: "23CSE211 · Unit 3", items: ["Introduction to NP class: P, NP, SAT, NP-complete, NP-hard", "Scalable algorithms: heuristic search, hill climbing, gradient descent, parallel algorithms"] },
      ],
      aie: [
        { from: "22AIE212 · Units 2 and 3", items: ["P, NP, NP-complete and NP-hard problems", "Approximation algorithms for NP-hard problems"] },
      ],
    },
    practice: [
      p("Is this problem in P or NP?", "easy"),
      p("Verify a proposed Hamiltonian cycle", "easy"),
      p("Reduce 3-SAT to a clique problem on paper", "medium"),
      p("A 2-approximation for vertex cover", "medium"),
      p("Pick a heuristic for a large travelling salesman instance", "hard"),
    ],
    viva: [
      "What does NP-complete mean?",
      "If a problem is NP-hard, what do you do in practice?",
      "What is a polynomial-time reduction, and what does it prove?",
    ],
  },
  arrays: {
    syllabus: {
      cse: [
        { from: "23CSE101 · Unit 2", items: ["Working with lists and arrays", "Searching and sorting"] },
        { from: "23CSE203 · Unit 1", items: ["Using arrays", "Array based list implementation"] },
      ],
      aie: [
        { from: "22AIE101 · Unit 3", items: ["Defining and processing an array", "Passing an array to a function", "Multi-dimensional arrays", "Sequential search"] },
        { from: "22AIE112 · Unit 1", items: ["Array data structure, properties and functions", "Single and multi-dimensional arrays", "Dynamic arrays"] },
      ],
    },
    practice: [
      p("Merge two sorted event feeds", "easy"),
      p("Rotate a playlist by k places", "easy"),
      p("Find the missing order ID", "medium"),
      p("Longest run of days a stock kept rising", "medium"),
      p("Water held between buildings on a skyline", "hard"),
    ],
    viva: [
      "Why is appending to a dynamic array O(1) amortised?",
      "Array or linked list: when does each win in practice?",
      "Which is faster to walk, a 2D array by rows or by columns, and why?",
    ],
  },
  strings: {
    syllabus: {
      cse: [
        { from: "23CSE101 · Unit 2", items: ["Strings, input and output"] },
        { from: "23CSE211 · Unit 3", items: ["String matching: Rabin Karp, Boyer Moore, KMP"] },
      ],
      aie: [
        { from: "22AIE101 · Unit 3", items: ["String handling", "Operations on strings"] },
        { from: "22AIE212 · Unit 1", items: ["Brute force: exhaustive search and string matching"] },
      ],
    },
    practice: [
      p("Check a username against the allowed format", "easy"),
      p("Are these two words anagrams?", "easy"),
      p("Compress repeated characters in a log line", "medium"),
      p("Longest substring without a repeated character", "medium"),
      p("Find a pattern in a long text efficiently", "hard"),
    ],
    viva: [
      "Why are strings immutable in Python and Java, and what does that cost?",
      "How would you compare two strings ignoring case and punctuation?",
      "Brute-force matching is O(nm). How does KMP avoid re-reading characters?",
    ],
  },
  time_complexity: {
    syllabus: {
      cse: [
        { from: "23CSE203 · Unit 1", items: ["Basic complexity analysis: best, worst and average cases", "Asymptotic analysis", "Analyzing programs: space bounds"] },
        { from: "23CSE211 · Unit 1", items: ["Asymptotic notation and its types", "Recurrence relations: recursion tree, substitution, Master Method"] },
      ],
      aie: [
        { from: "22AIE112 · Unit 1", items: ["Basics of algorithm analysis, big-O notation", "Time and space complexity"] },
        { from: "22AIE212 · Unit 1", items: ["Asymptotic notations and growth rate", "Empirical analysis", "Recursive and non-recursive templates"] },
      ],
    },
    practice: [
      p("Estimate the cost of nested loops from the code", "easy"),
      p("Spot the hidden O(n²) in a string-building loop", "easy"),
      p("Pick a structure for a million-row lookup", "medium"),
      p("Solve T(n) = 2T(n/2) + n with a recursion tree", "medium"),
      p("Bring a slow report from O(n²) to O(n log n)", "hard"),
    ],
    viva: [
      "What are the best, worst and average cases of linear search?",
      "Is an O(n) algorithm always faster than an O(n²) one on small inputs?",
      "What does recursion cost in space?",
    ],
  },
  hashing: {
    syllabus: {
      cse: [{ from: "23CSE203 · Unit 2", items: ["Maps and dictionaries: Map ADT, list based implementation", "Hash tables", "Dictionary ADT"] }],
    },
    practice: [
      p("Count word frequencies in a document", "easy"),
      p("Spot duplicate transaction IDs", "easy"),
      p("Group anagrams from a word list", "medium"),
      p("Two payments that add up to a target", "medium"),
      p("Design an LRU cache for a web page store", "hard"),
    ],
    viva: [
      "How does a hash table handle collisions?",
      "Why does the hash function matter, and what does a bad one do?",
      "When does a lookup degrade to O(n)?",
    ],
  },
  sliding_window: {
    syllabus: {},
    practice: [
      p("Highest total over any 3 consecutive days", "easy"),
      p("Best average of k consecutive readings", "easy"),
      p("Longest substring with at most two distinct characters", "medium"),
      p("Longest stretch of uptime with at most k failures", "medium"),
      p("Smallest window that contains every required skill", "hard"),
    ],
    viva: [
      "When is it safe to shrink the window?",
      "There is a loop inside a loop. Why is the total still O(n)?",
      "Two pointers or a sliding window: how do you choose?",
    ],
  },
  prefix_sums: {
    syllabus: {},
    practice: [
      p("Answer range-sum queries on daily sales", "easy"),
      p("Running balance across transactions", "easy"),
      p("Count subarrays that add up to k", "medium"),
      p("Find the point where left and right totals match", "medium"),
      p("Sum of any rectangle in an image", "hard"),
    ],
    viva: [
      "What does the precomputation cost, and what does it save?",
      "Why does a hash map find subarrays that sum to k?",
      "Where would a difference array help?",
    ],
  },
  stacks: {
    syllabus: {
      cse: [{ from: "23CSE203 · Unit 1", items: ["Stack ADT", "Array based stacks and linked stacks", "Implementing recursion using stacks", "Stack applications"] }],
      aie: [{ from: "22AIE112 · Unit 3", items: ["Stack data structure, properties and functions", "Recursion", "Expression evaluation"] }],
    },
    practice: [
      p("Balanced brackets in a code editor", "easy"),
      p("Undo and redo history for a text editor", "easy"),
      p("Evaluate a postfix expression", "medium"),
      p("Days until a warmer temperature", "medium"),
      p("Largest rectangle in a skyline", "hard"),
    ],
    viva: [
      "Where does the call stack show up when recursion goes wrong?",
      "Array based or linked stack: what changes?",
      "Walk me through evaluating an expression with a stack.",
    ],
  },
  queues: {
    syllabus: {
      cse: [{ from: "23CSE203 · Unit 1", items: ["Queue ADT", "Array based and linked queues", "Double-ended queue", "Circular queue", "Applications"] }],
      aie: [{ from: "22AIE112 · Unit 3", items: ["Queue data structure", "Circular queue", "Double ended queue", "Priority queues"] }],
    },
    practice: [
      p("Ticket counter simulation", "easy"),
      p("Round-robin task scheduler", "easy"),
      p("Build a queue out of two stacks", "medium"),
      p("Requests received in the last five minutes", "medium"),
      p("Maximum of every window of k readings", "hard"),
    ],
    viva: [
      "Why use a circular queue?",
      "Queue, deque and priority queue: what separates them?",
      "Where do queues show up inside an operating system?",
    ],
  },
  linked_lists: {
    syllabus: {
      cse: [{ from: "23CSE203 · Unit 1", items: ["Linked Lists and the LL ADT", "Singly linked list", "Doubly linked list", "Circular linked list"] }],
      aie: [{ from: "22AIE112 · Unit 2", items: ["Linked list properties and functions", "Array implementations", "Singly, doubly and circular linked lists"] }],
    },
    practice: [
      p("Reverse a linked list", "easy"),
      p("Find the middle of a playlist", "easy"),
      p("Detect a loop in a chain of redirects", "medium"),
      p("Merge two sorted lists", "medium"),
      p("Copy a list whose nodes also point at random nodes", "hard"),
    ],
    viva: [
      "Why can you not binary search a linked list?",
      "Singly or doubly linked: what extra do you pay for?",
      "How does the slow and fast pointer trick work?",
    ],
  },
  sorting: {
    syllabus: {
      cse: [
        { from: "23CSE101 · Unit 3", items: ["Searching and sorting"] },
        { from: "23CSE211 · Units 1 and 2", items: ["Bubble, insertion, selection, bucket and heap sort", "Comparison of sorting algorithms", "Merge sort, quick sort, quick select"] },
      ],
      aie: [
        { from: "22AIE101 · Unit 3", items: ["Sorting arrays"] },
        { from: "22AIE212 · Unit 1", items: ["Merge sort, quick sort, heap sort"] },
        { from: "22AIE203 · Unit 3", items: ["Radix sort"] },
      ],
    },
    practice: [
      p("Rank exam scores", "easy"),
      p("Sort by marks, then by name, keeping ties in order", "easy"),
      p("Merge overlapping meeting slots", "medium"),
      p("Kth largest order value", "medium"),
      p("Count how out of order a ranking is", "hard"),
    ],
    viva: [
      "Why is quicksort often faster than merge sort in practice?",
      "What does a stable sort mean, and when does it matter?",
      "When would you reach for insertion sort?",
    ],
  },
  binary_search: {
    syllabus: {
      cse: [{ from: "23CSE211 · Unit 2", items: ["Binary search type strategies", "Pivot based strategies"] }],
      aie: [{ from: "22AIE212 · Unit 1", items: ["Divide and conquer methodology: binary search"] }],
    },
    practice: [
      p("Look up a name in a sorted contact list", "easy"),
      p("First bad build in a release history", "easy"),
      p("Search in a rotated sorted array", "medium"),
      p("Least capacity that ships all packages in D days", "medium"),
      p("Median of two sorted arrays", "hard"),
    ],
    viva: [
      "Why is binary search O(log n)?",
      "What is the classic off-by-one bug?",
      "Can you binary search on an answer instead of an array?",
    ],
  },
  recursion: {
    syllabus: {
      cse: [
        { from: "23CSE101 · Unit 2", items: ["Functions", "Recursion"] },
        { from: "23CSE203 · Unit 1", items: ["Linear, binary and multiple recursions", "Implementing recursion using stacks"] },
      ],
      aie: [
        { from: "22AIE101 · Unit 3", items: ["Functions", "Recursion"] },
        { from: "22AIE112 · Unit 3", items: ["Recursion with stacks"] },
      ],
    },
    practice: [
      p("Sum of the digits of a number", "easy"),
      p("Fibonacci with memoisation", "easy"),
      p("List every subset of a set", "medium"),
      p("Flatten a nested comment thread", "medium"),
      p("Generate every valid bracket string", "hard"),
    ],
    viva: [
      "What is the base case, and what happens without one?",
      "Why is naive Fibonacci exponential?",
      "When would you rewrite recursion as a loop?",
    ],
  },
  divide_and_conquer: {
    syllabus: {
      cse: [{ from: "23CSE211 · Unit 2", items: ["Merge sort, quick sort, quick select", "Long integer multiplication", "Maximum subarray sum", "Closest pair problem and convex hull"] }],
      aie: [{ from: "22AIE212 · Unit 1", items: ["Divide and conquer: binary search, merge sort, quick sort, heap sort", "Multiplication of large integers"] }],
    },
    practice: [
      p("Raise a number to a large power quickly", "easy"),
      p("Largest and smallest of a list by halving it", "easy"),
      p("Maximum subarray sum", "medium"),
      p("Merge sort a large log file", "medium"),
      p("Closest pair of delivery points", "hard"),
    ],
    viva: [
      "State the Master Method and apply it to merge sort.",
      "Divide and conquer or dynamic programming: how do you tell?",
      "Why does quickselect find the kth element in expected linear time?",
    ],
  },
  tree_traversals: {
    syllabus: {
      cse: [{ from: "23CSE203 · Unit 2", items: ["Tree definition and properties", "Basic tree traversals", "Binary tree", "Linked structure and array based implementation"] }],
      aie: [{ from: "22AIE112 · Unit 4", items: ["Binary tree", "Array and linked list representation", "Complete binary tree"] }],
    },
    practice: [
      p("Height of a folder tree", "easy"),
      p("Print a tree level by level", "easy"),
      p("Is the tree a mirror of itself?", "medium"),
      p("Lowest common manager of two employees", "medium"),
      p("Save a tree to text and rebuild it", "hard"),
    ],
    viva: [
      "Preorder, inorder, postorder: when do you need each?",
      "Recursive or iterative traversal: what does each cost?",
      "How is a binary tree stored in an array?",
    ],
  },
  binary_search_trees: {
    syllabus: {
      cse: [{ from: "23CSE203 · Unit 3", items: ["Search trees: binary search tree"] }],
      aie: [{ from: "22AIE112 · Unit 4", items: ["Binary search tree", "Array and linked list representation"] }],
    },
    practice: [
      p("Insert and find a student ID", "easy"),
      p("Is this tree a valid BST?", "easy"),
      p("Kth smallest value in a BST", "medium"),
      p("Delete a node from a BST", "medium"),
      p("Fix a BST where two nodes were swapped", "hard"),
    ],
    viva: [
      "What does a BST give you that a hash table does not?",
      "What happens when you insert already sorted data?",
      "Walk me through deleting a node that has two children.",
    ],
  },
  balanced_trees: {
    syllabus: {
      cse: [{ from: "23CSE203 · Unit 3", items: ["AVL tree and its rotation", "Segment trees", "B-Trees", "External memory sorting and searching"] }],
      aie: [{ from: "22AIE112 · Unit 4", items: ["AVL tree"] }],
    },
    practice: [
      p("Rotate a three-node skewed tree", "easy"),
      p("Is this tree height-balanced?", "easy"),
      p("Insert into an AVL tree and name each rotation", "medium"),
      p("Range sum with a segment tree", "medium"),
      p("How many keys fit in a B-tree node on a 4 KB page?", "hard"),
    ],
    viva: [
      "Why balance a tree at all?",
      "Name the four AVL rotation cases.",
      "Why do databases prefer B-trees to AVL trees?",
    ],
  },
  heaps: {
    syllabus: {
      cse: [
        { from: "23CSE203 · Unit 2", items: ["Priority queues: ADT, implementing with a list", "Heaps"] },
        { from: "23CSE211 · Unit 1", items: ["Heap sort"] },
      ],
      aie: [
        { from: "22AIE112 · Units 3 and 4", items: ["Priority queues", "Binary heap data structure", "Heap order and heapsort"] },
      ],
    },
    practice: [
      p("Kth largest in a stream of scores", "easy"),
      p("Sort an array with heapsort", "easy"),
      p("Merge k sorted log files", "medium"),
      p("Run tasks by priority", "medium"),
      p("Median of a data stream", "hard"),
    ],
    viva: [
      "Min-heap or max-heap to keep the top k, and why?",
      "Building a heap is O(n). Why not O(n log n)?",
      "Heap or balanced BST for a priority queue?",
    ],
  },
  graphs_representation: {
    syllabus: {
      cse: [{ from: "23CSE203 · Unit 3", items: ["Graph ADT", "Data structures for graphs", "Weighted graphs"] }],
      aie: [{ from: "22AIE203 · Unit 1", items: ["Representations of graphs", "Adjacency and incidence matrices", "Adjacency list"] }],
    },
    practice: [
      p("Build an adjacency list from friend pairs", "easy"),
      p("Who has the most connections?", "easy"),
      p("Count the islands on a map", "medium"),
      p("Clone a graph", "medium"),
      p("Find the celebrity at a party", "hard"),
    ],
    viva: [
      "Adjacency matrix or list: when does each win?",
      "What changes in the code between directed and undirected?",
      "How much memory does a sparse graph need in each form?",
    ],
  },
  graph_traversal_bfs: {
    syllabus: {
      cse: [
        { from: "23CSE203 · Unit 3", items: ["Graph traversal"] },
        { from: "23CSE211 · Unit 1", items: ["Applications of BFS: distance, connectivity, connected components, cycles in undirected graphs"] },
      ],
    },
    practice: [
      p("Shortest way out of a maze", "easy"),
      p("Degrees of separation between two users", "easy"),
      p("Minutes until every orange has rotted", "medium"),
      p("Shortest chain of word changes", "medium"),
      p("Distance from every room to the nearest exit", "hard"),
    ],
    viva: [
      "Why does BFS find shortest paths in an unweighted graph?",
      "BFS or DFS: which uses more memory?",
      "How do you track visited nodes, and why must you?",
    ],
  },
  graph_traversal_dfs: {
    syllabus: {
      cse: [{ from: "23CSE211 · Unit 1", items: ["Applications of DFS: topological sort, cycles in directed graphs", "Biconnected components and strong connectivity"] }],
    },
    practice: [
      p("Count connected regions in an image", "easy"),
      p("Is there a route between two cities?", "easy"),
      p("Detect a cycle in a directed graph", "medium"),
      p("List every path from source to target", "medium"),
      p("Find strongly connected components", "hard"),
    ],
    viva: [
      "Recursive or iterative DFS: what about stack depth?",
      "What are the edge types DFS finds?",
      "How does DFS detect a cycle?",
    ],
  },
  shortest_paths: {
    syllabus: {
      cse: [
        { from: "23CSE203 · Unit 3", items: ["Weighted graphs", "Shortest paths"] },
        { from: "23CSE211 · Unit 1", items: ["Single source: Bellman Ford", "All pairs: Floyd Warshall"] },
      ],
    },
    practice: [
      p("Fewest stops between two metro stations", "easy"),
      p("Dijkstra on a small road map", "medium"),
      p("Time for a signal to reach every node", "medium"),
      p("All-pairs distances for five cities", "medium"),
      p("Cheapest flight with at most k stops", "hard"),
    ],
    viva: [
      "Why does Dijkstra fail with negative edges?",
      "When do you reach for Bellman-Ford instead?",
      "What is Dijkstra's complexity with a heap compared with an array?",
    ],
  },
  minimum_spanning_tree: {
    syllabus: {
      cse: [
        { from: "23CSE203 · Unit 3", items: ["Minimum spanning tree", "Greedy methods for MST"] },
        { from: "23CSE211 · Unit 1", items: ["Review of minimum spanning tree, with analysis and applications"] },
      ],
    },
    practice: [
      p("Cable five offices at the lowest cost", "easy"),
      p("Run Kruskal by hand on an edge table", "easy"),
      p("Does adding this edge make a cycle?", "medium"),
      p("Cheapest way to connect every city", "medium"),
      p("Which edges are in every minimum spanning tree?", "hard"),
    ],
    viva: [
      "Kruskal or Prim: when does each fit?",
      "State the cut property in one sentence.",
      "Is the minimum spanning tree unique?",
    ],
  },
  topological_sort: {
    syllabus: {
      cse: [
        { from: "23CSE203 · Unit 3", items: ["Directed acyclic graphs"] },
        { from: "23CSE211 · Unit 1", items: ["Applications of DFS: topological sort"] },
      ],
    },
    practice: [
      p("Order tasks that depend on each other", "easy"),
      p("Can every course be finished?", "medium"),
      p("Build order for software packages", "medium"),
      p("Fewest semesters to finish a degree plan", "medium"),
      p("Recover the letter order of an unknown alphabet", "hard"),
    ],
    viva: [
      "Why does it need a DAG?",
      "Kahn's algorithm or DFS: how do they differ?",
      "How do you tell that no valid order exists?",
    ],
  },
  greedy: {
    syllabus: {
      cse: [
        { from: "23CSE203 · Unit 3", items: ["Greedy methods for MST"] },
        { from: "23CSE211 · Unit 2", items: ["Greedy algorithm: fractional knapsack, task scheduling, Huffman coding"] },
      ],
      aie: [{ from: "22AIE212 · Unit 2", items: ["Greedy technique: container loading problem, Huffman trees"] }],
    },
    practice: [
      p("Fewest coins to make change", "easy"),
      p("Most meetings in one room", "easy"),
      p("Fractional knapsack for a delivery van", "medium"),
      p("Schedule jobs with deadlines for most profit", "medium"),
      p("Huffman code lengths for a message", "hard"),
    ],
    viva: [
      "What makes a problem solvable greedily?",
      "Give a coin system where greedy change fails.",
      "Why does choosing the earliest finish time work for scheduling?",
    ],
  },
  dynamic_programming: {
    syllabus: {
      cse: [{ from: "23CSE211 · Unit 2", items: ["Fibonacci numbers", "0-1 knapsack", "Matrix chain multiplication", "Longest common subsequence", "Optimal binary search tree"] }],
      aie: [{ from: "22AIE212 · Unit 2", items: ["Principle of optimality", "Coin changing problem", "Computing a binomial coefficient", "Floyd's algorithm", "Optimal binary search trees", "Knapsack and memory functions"] }],
    },
    practice: [
      p("Ways to climb a staircase", "easy"),
      p("Fewest coins to reach an amount", "medium"),
      p("Longest common subsequence of two filenames", "medium"),
      p("Pack a bag with the most value", "medium"),
      p("Edit distance for a spell checker", "hard"),
    ],
    viva: [
      "Explain optimal substructure and overlapping subproblems with Fibonacci.",
      "Top-down or bottom-up: what is the trade-off?",
      "How do you cut a 2D table down to one row?",
    ],
  },
  backtracking: {
    syllabus: {
      cse: [{ from: "23CSE211 · Unit 3", items: ["Backtracking and branch and bound", "N-Queen problem", "Subset sum", "0-1 knapsack"] }],
      aie: [{ from: "22AIE212 · Unit 3", items: ["Backtracking: n-Queen, Hamiltonian circuit, subset sum"] }],
    },
    practice: [
      p("Every ordering of three letters", "easy"),
      p("Which numbers add up to the target?", "medium"),
      p("Words a phone keypad can spell", "medium"),
      p("Place four queens on a board", "medium"),
      p("Solve a Sudoku", "hard"),
    ],
    viva: [
      "How is backtracking different from brute force?",
      "What does pruning buy you?",
      "Why is n-Queens exponential and still solvable for small n?",
    ],
  },
};

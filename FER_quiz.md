Analyze the differences between Flux and MVC architectures. Which statement is true?
A. Flux enforces unidirectional data flow, while MVC allows bidirectional data flow.
B. MVC enforces unidirectional data flow, while Flux allows bidirectional data flow.
C. Both Flux and MVC enforce unidirectional data flow.
D. Both Flux and MVC allow bidirectional data flow.
Đáp án: A
Giải thích: Kiến trúc Flux của Facebook bắt buộc luồng dữ liệu một chiều nghiêm ngặt (Action $\rightarrow$ Dispatcher $\rightarrow$ Store $\rightarrow$ View). Trong khi đó, mô hình MVC truyền thống cho phép dữ liệu cập nhật hai chiều phức tạp giữa Model và View, dé gây ra hiệu ứng thác dé (cascading updates).

Which component is typically used in conjunction with React.lazy to handle the loading state?
A. <ErrorBoundary>
B. <Suspense>
C. <LoadingComponent>
D. <Provider>
Đáp án: B
Giải thích: Component <Suspense? là tinh năng tích hợp sẵn của React, bắt buộc phải dùng chung với React.lazy nhằm bọc các component tải chậm và cung cấp một thuộc tinh fallback dé hiển thị giao diện chờ (loading UI).

What is Redux Thunk used for?
A. To manage asynchronous actions in Redux.
B. To log every action dispatched to the Redux store.
C. To split reducers into simpler functions.
D. To handle side effects in React components.
Đáp án: A
Giải thích: Redux Thunk là một middleware cho phép lập trình viên viết các action creator trả về một hàm (function) thay vì một plain object, giúp xử lý các logic bất đồng bộ (như gọi API) trước khi dispatch action vào Store.

How do you wrap a lazy-loaded component with a fallback in React?
A. Suspense loader=(<div> Loading...</dv>p> < Lazy Component > </Suspense>
B. Suspense fallback={<div> Loading...</div>}> <LazyComponent/> </Suspense>
C. <Await fallback="(<div">Loading...</div>)> <Lazy Component/> </Await>
D. <Loading fallback="|<div"> Loading.....</dv> <LazyComponent/> </Loading>
Đáp án: B
Giải thích: Bat chấp các lỗi ký tự do quét đề (OCR), cú pháp chuẩn của React yêu cau sử dụng thẻ <Suspense> với thuộc tinh fallback nhận vào một phần tử JSX để làm giao diện chờ trong khi component lười (lazy component) dang được tải.

How would you handle errors in a fetch request to ensure that the error is caught and logged to the console?
A. fetch(url)then((response)=> {return response.json();} ).catch(error => console.log(error))
B. fetch(url). then(response => response.catcherror => console.log(error)))
C. fetch(url).catcherror => (console.log(error) ))
D. fetch(url).then(response => ( throw new Error ]). catcherror => console.log(error))
Đáp án: A
Giải thích: Đây là mô hình chuẩn chuỗi Promise của Fetch API: hàm then() đầu tiên tiếp nhận phản hồi và giải mã JSON, theo sau là phương thức .catch() ở cuối chuỗi dé bắt và ghi nhận bat kỳ lỗi kết nối mang hoặc lỗi cú pháp nào phát sinh lên console.

What is one of the primary benefits of using Promises in JavaScript for asynchronous operations?
A. It allows direct modification of the DOM
B. It makes synchronous code asynchronous.
C. It helps solve the "callback hell" problem by allowing chains of asynchronous operations.
D. It ensures data is always instantaneously available.
Đáp án: C
Giải thích: Bản chất của Promise là cung cắp cơ chế bắt chuỗi liên tiếp (then()), giúp chuyển đổi các cầu trúc hàm gọi lại lồng nhau sâu hoắm (Callback Hell / Pyramid of Doom) thành mã nguồn phẳng, dễ đọc và dễ bảo trì hơn.

What are the three possible states of a Promise as described in the sources?
A. Initial, Running, Completed
B. Starting, Paused, Finished
C. Pending, Fulfilled, Rejected
D. Waiting, Processing, Error Answer
Đáp án: C
Giải thích: Theo đặc ta ECMAScript chuẩn, một Promise luôn nằm ở một trong ba trạng thái duy nhất: Pending (đang chờ xử lý), Fulfilled (xử lý thành công và trả về kết quả), hoặc Rejected (thất bại kèm theo lý do/lỗi).

After making a successful fetch request, how would you retrieve the JSON data from the response object?
A. response.data()
B. responsejson()
C. response jsonText()
D. response.body json
Đáp án: B
Giải thích: Đối tượng Response của Fetch API cung cắp sẵn phương thức khởi tạo bắt đồng bộ json(). Phương thức này đọc luồng dữ liệu từ body của response và parse nó thành một đối tượng JavaScript JavaScript Object.

Which React concept is used to pass data from a parent component to a child component?
A. State
B. Props
C. Context
D. Ref
Đáp án: B
Giải thích: Props (Properties) là cơ chế nền tảng và chính thống nhất trong React dùng để truyền dữ liệu theo luồng một chiều từ component cha xuống component con, đóng vai trò như các tham số cau hình chi đọc.

What is the main difference between props and state?
A. Props are mutable, while state is immutable.
B. State is used for passing data between components, while props are used to manage component behavior.
C. Props do not change after the initial render, while state can change over time.
D. State is used for rendering Ul, while props are used for functionality.
Đáp án: C
Giải thích: Props mang tính chất bắt bién (chỉ đọc đối với component nhận nó), cầu hình tinh từ cha; trong khi State đại diện cho dữ liệu nội bộ có thể thay đổi theo thời gian thông qua hành động của người dùng để kích hoạt re-render giao diện.

When should the useReducer Hook be used instead of useState()2
A. When components require simple, independent state values.
B. When performing initialization and cleanup actions
C. When there is complex state logic, several sub-values, or when the upcoming state depends on the previous state
D. When sharing data across a component hierarchy without prop
Đáp án: C
Giải thích: Tài liệu chính thức của React khuyên nghị dùng useReducer thay vì useState khi component sở hữu logic trạng thái phức tạp, chứa nhiều giá trị phụ thuộc lẫn nhau, hoặc trạng thái tiếp theo phụ thuộc nặng nề vào trạng thái trước đó.

Which method would you use to update the state of a component in React?
A. setState
B. getState
C. updateState
D. modify State
Đáp án: A
Giải thích: Trong kiến trúc Class Component cổ điển của React, phương thức this.setState là cách duy nhất để cập nhật trạng thái hợp lệ. Đối với Functional Component, ham setter trả vé tl useState cũng tuân theo triết lý của khái niệm cốt lõi này.

`. Select the benefits of using React.memo and useMemo in React applications. (Choose 2 correct answers)
A. Prevent unnecessary component re-renders
B. Automatically synchronize component state with global state
C. Guarantee object references don't change during re-rendering
D. Simplify the process of context management
Đáp án: A, C
Giải thích: React.memo là một Higher-Order Component giúp bỏ qua việc re-render component nếu đạo cụ (props) không đổi (Đáp án A). Còn useMemo lưu trữ kết quả tính toán giữa các lần render, đảm bảo tham chiều đối tượng (object references) không bị khởi tạo lại vô ích (Đáp án C).

How do you define a route that matches /users/123 and passes the 123 as a parameter to the component?
A. Route path="/users?id" element={<User/>} >
B. <Route element="{<User" path="/users/:id"/>} />
C. Route path="/users/(id}" element={<User/>} >
D. «Route path="/users/#id™ element={<User/>} />
Đáp án: B
Giải thích: Trong thư viện React Router, ký tự dầu hai cham () được quy ước đặt trước tên biến (vi dụ :id) để khai báo một tham số đường dẫn động (dynamic URL path parameter), giúp khớp với mọi giá trị cụ thể như /users/123.

When declaring routes in React Router, what are Routes and Route components used for?
A. Routes is for styling, and Route is for defining event handlers.
B. Routes is for managing state, and Route is for rendering components.
C. Routes is used to wrap Route components and define the application's routes, while Route is used to define an individual route.
D. Routes is for client-side logic, and Route is for server-side logic
Đáp án: C
Giải thích: Kể từ phiên bản React Router v6, <Routes> đóng vai trò là phan tử cha bọc ngoài (container) chịu trách nhiệm kiểm tra vị tri URL hiện tại dé tìm kiếm và kết khớp chính xác duy nhất một phần tử con <Route> đơn lẻ nằm bên trong nó.

Which component is used to define a route in React Router?
A. <Route>
B. <Router>
C. <Link>
D. <Navigation>
Đáp án: A
Giải thích: Khác với <Router> (bộ định tuyến cấp cấu hình) hay <Link> (thẻ điều hướng), chính component <Route> mới là thực thể định nghĩa trực tiếp cặp ánh xạ giữa thuộc tính path (đường dẫn URL) và thuộc tính element (giao diện component hiển thị tương ứng).

What is the purpose of json-server in client-server communication?
A. To set up a simple static web server that serves data to clients.
B. To encrypt data during transmission between client and server.
C. To manage client authentication and session data.
D. To provide a full-featured backend for the React application.
Đáp án: A
Giải thích: Trong phạm vi thực hành môn hoc Front-End, json-server cung cấp giải pháp dựng nhanh một máy chủ cục bộ tĩnh cấp tốc để mô phỏng (mock) day đủ một REST API từ một tệp json đơn giản, giúp client thực hiện việc lấy/gửi dữ liệu mà không cân viết code backend thực tế.

Which of the following is the correct syntax to use useDispatch in a functional component?
A. const MyComponent = () => { const dispatch = useDispatch; return <div>My Component</div>; };
B. const MyComponent = () => { const dispatch = useDispatch; return <div>My Component</div>; };
C. const MyComponent = () => { const dispatch = dispatch; return <div>My Component</div>; };
D. const MyComponent = () => { const dispatch = useDispatch(); return <div>My Component</div>; k
Đáp án: D
Giải thích: Do React Hooks là các hàm JavaScript thông thường, ta bắt buộc phải thực thi hook bằng cặp dấu ngoặc đơn useDispatch() (như ở phương án D) để nhận về phiên bản hàm điều phối hành động (dispatch function) của Redux store.

Which of the following is a valid JSON object?
A. { "name": "John Doe", "age": 30, "city": "New York" }
B. { 'name': 'John Doe', 'age': '30', 'city': 'New York' }
C. { name: "John Doe", age: 30, city: "New York" }
D. { "name" = "John Doe", "age" = 30, "city" = "New York" }
Đáp án: A
Giải thích: Đặc tả định dạng dữ liệu JSON tiêu chuẩn bắt buộc: 1) Tên các thuộc tính (keys) phải được bọc trong cặp dấu nháy kép; 2) Cặp key/value phân tách bằng dấu hai chấm. Do đó phương án A là cấu trúc chuẩn nhất.

What is the primary architectural style used in designing web services that follow REST principles?
A. SOAP (Simple Object Access Protocol)
B. RPC (Remote Procedure Call)
C. MVC (Model-View-Controller)
D. RESTful (Representational State Transfer)
Đáp án: D
Giải thích: Các dịch vụ web ứng dụng và tuân thủ các nguyên tắc ràng buộc của kiến trúc REST được định danh một cách chính xác về mặt học thuật là hệ thống dịch vụ theo phong cách thiết kế RESTful.

Create a React component that uses composition to include a header, main content, and footer. Which code ‘snippet is correct?
A. function App() { return (<div><Header /><MainContent /><Footer /></div>);
B. function App() { return (<div><Header /><Footer /><MainContent /></diV>); }
C. function App() { return (<div><MainContent /><Header /><Footer /></div>); )
D. function App0 { return (<div><Footer /><Header /><MainContent /></div>); }
Đáp án: A
Giải thích: . Phương thức lập lập bồ cục giao diện (layout composition) chuẩn ngữ nghĩa web yêu cầu các component được đặt và sắp xếp tuần tự theo đúng luồng hiển thị từ trên xuống dưới: Khởi đầu bằng <Header/>, thân bài là <MainContent/> và kết thúc ở <Footer/>.

Create a React component that displays a list of items passed as props. Which approach would you use?
A. Use a functional component with the map method
B. Use a class component with componentDidMount
C. Use a higher-order component
D. Use a lifecycle method to fetch data
Đáp án: A
Giải thích: Cách làm mang tính thành ngữ (idiomatic way) và tối ưu nhất của React dé duyệt qua một danh sách mảng dữ liệu được truyền từ prop rồi chuyển đổi chúng sang các phan tử UI chính là tao Functional Component kết hợp phương thức mảng .map().

How can you avoid contradictions in state with this code? const [isOpen, setIsOpen] = useState(false); const [buttonText, setButtonText] = useState(isOpen ? "Close" : "Open"); function toggle() { setIsOpen(!isOpen); setButtonText(isOpen ? "Open" : "Close"); }
A. The code above is fine as it is.
B. Remove buttonText from state and calculate it dynamically in the render method based on isOpen.
C. Keep both isOpen and buttonText in state but update them separately.
D. Use useEffect to sync buttonText with isOpen.
Đáp án: B
Giải thích: Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án B: nên loại bỏ buttonText khỏi state và tính toán nó động dựa trên isOpen để tránh hai state mâu thuẫn nhau.

What is the main advantage of using Hooks in React?
A. Hooks allow React to maintain internal state without classes
B. Hooks simplify sharing functionality between components
C. Hooks remove the need for functional components
D. Hooks only support stateful components
Đáp án: B
Giải thích: Động lực lớn nhất mà Facebook tạo ra React Hooks là hỗ trợ việc đóng gói, tái sử dụng và chia sẻ dễ dàng các khối logic nghiệp vụ có trạng thái (stateful logic) giữa các component khác nhau mà không cân cấu trúc lại cây phân cấp (như HOC hay Render Props làm trước đây).

What does the default case in the reducer function do?
A. Resets the state
B. Handles unknown actions
C. Throws an error for unknown actions
D. Returns the current state
Đáp án: D
Giải thích: Theo nguyên lý thiết kế hàm thuần khiết (pure functions) của Redux/useReducer, khi một action không khớp với bắt kỳ case xử lý cụ thể nào được gửi tới, khối default phải trả về đối tượng trạng thái hiện hành (state) mà không được biến đổi nó để đảm bảo tính an toàn cho ứng dụng.

What is the purpose of package.json in a Node js project?
A. It defines the project's dependencies and scripts
B. It contains the source code of the project
C. It configures the Nodejs environment
D. It manages the project's build process
Đáp án: A
Giải thích: Tệp package.json hoạt động như một bản kê khai (manifest specification) trọng tâm của dự án Nodejs, chịu trách nhiệm lưu trữ cầu hình siêu dữ liệu (metadata), danh sách các thư viện phụ thuộc (dependencies) và các tập lệnh chạy nhanh (npm scripts).

What is the main purpose of React in modern web development, and what type of applications does it best support?
A. Itis mainly designed for handling backend logic and database management
B. React helps build interactive user interfaces, especially for SPAs.
C. React primarily functions as a server-side rendering engine for web applications.
D. Itis mainly a mobile development framework and not suitable for web applications.
Đáp án: B
Giải thích: React là một thư viện JavaScript chuyên biệt dành riêng cho tầng Client-side để xây dựng các giao diện người dùng (UI) có tính tương tác cao và có hiệu năng tối ưu nhat khi vận hành các ứng dụng đơn trang (SPA - Single Page Applications).

Which of the following is NOT a feature of React?
A. Component-Based
B. Virtual DOM
C. Large Community
D. Server-Side Rendering
Đáp án: D
Giải thích: Bản thân nhân cốt lõi (Core core library) của React chỉ chịu trách nhiệm kết xuất UI tại client-side thông qua cơ chề Virtual DOM dựa trên các Component. Tinh năng Server-Side Rendering (SSR) không phải là tính năng nội tại tích hợp mặc định của lõi React mà phải nhờ đến framework mở rộng như Next.js hỗ trợ.

How can you conditionally render content in JSX?
A. By using the if statement
B. By using the for loop
C. By using the ternary operator (condition? trueContent: falseContent)
D. By using the switch statement
Đáp án: C
Giải thích: Vì các câu lệnh điều khiển rẽ nhánh như if hay switch mang tính chất là câu lệnh thực thi (statements) chứ không phải biểu thức trả về giá trị (expressions), chúng ta không thể nhúng trực tiếp. chúng vào trong cặp ngoặc {† của JSX mà bắt buộc phải sử dụng toán tử ba ngôi (ternary operator).

Which method is used to perform enhanced array manipulation in ES6?
A. map()
B. forEach()
C. reduce
D. filter()
Đáp án: A
Giải thích: Trong khuôn khổ phát triển React (FER202), phương thức map() của ES6 được tôn vinh như công cụ thao túng mảng nâng cao cơ bản và thiết yêu nhất nhờ đặc tính bắt biến (immutability) — nó biến đổi các phần tử của mảng cũ thành một mảng các node JSX mới hoàn toàn mà không làm thay đổi mảng gốc.

In JSX, which of the following is correct?
A. You must always wrap JSX ina single root element
B. You can use multiple root elements without any wrapping
C. JSX tags can be self-closing only for non-void elements
D. JSX does not support attributes like className
Đáp án: A
Giải thích: Trình biên dịch JSX (Babel) thực hiện chuyển đổi mã nguồn thành các lệnh gọi hàm React.createElement(). Hàm này yêu cầu duy nhất một đối tượng gốc trả về tại một thời điểm, vì vậy bắt buộc tat cả phan tử đồng cấp phải được bọc trong một phân tử gốc duy nhất (hoặc thẻ Fragment <> </>).

How can you install React-Bootstrap in your ReactJS project?
A. By using npm or yarn to install the package.
B. By downloading the React-Bootstrap files from a website.
C. By copying and pasting the React-Bootstrap code into your project.
D. By using a CDN link to include React-Bootstrap in your HTML file.
Đáp án: A
Giải thích: Tiến trình phát triển phần mềm chuẩn công nghiệp với môi trường Nodejs quản lý các module bên thứ ba bằng cách vận hành các trình quản lý gói phân phối chính thức là npm hoặc yarn dé tự động tải về thư viện vào mục node_modules.

How do you use the Grid system in React-Bootstrap
A. Quy trình lồng thé sai ngữ pháp
B. Khai báo cột sai tên component
C. Quy trình chuẩn: <Container> <Row> <Col>...</Col> </Row> </Container>
D. Sắp xếp sai trật tự phân cap của các thé Grid
Đáp án: C
Giải thích: Hệ thống lưới phân chia bồ cục màn hình (Grid System) của Bootstrap chuyển dịch sang React- Bootstrap quy định cấu trúc cây phân cấp nghiêm ngặt từ ngoài vào trong bắt buộc phải tuân thủ đúng thứ tự: Lớp bao bọc ngoài cùng <Container>, thiết lập hàng ngang <Row>, và cuối cùng là phân chia cột đứng <Col>.

What is the purpose of the 'fluid' prop in React-Bootstraps Container component?
A. It makes the container take up the entire width of the viewport.
B. It enables the container to display text.
C. It changes the container's background color.
D. It makes the container fixed width.
Đáp án: A
Giải thích: Việc truyền thuộc tính fluid (tương đương class .container-fluid trong CSS gốc) chỉ thị cho. component Container hủy bỏ độ rộng cố định theo từng breakpoint kích thước, chuyển sang kéo giãn bao phủ toàn bộ 100% chiều rộng khung nhìn màn hình (viewport width).

Assess the impact of using inline event handlers in React components. Which statement is true?
A. Inline event handlers improve performance by reducing the number of function calls
B. Inline event handlers can lead to performance issues due to the creation of new functions on each render
C. Inline event handlers are the only way to handle events in React
D. Inline event handlers are more secure than named event handlers
Đáp án: B
Giải thích: Định nghĩa các hàm ẩn danh dạng mũi tên (Q => {}) trực ếp tại thuộc tính sự kiện của JSX đồng nghĩa với việc một tham chiều hàm mới hoàn toàn sẽ bị buộc phải tái tạo lại ở mọi chu kỳ re-render của component, có thể dẫn đến quá tải bộ nhớ và gây sụt giảm hiệu năng hệ thống.

Analyze the benefits of using synthetic events in React. Which of the following is NOT a benefit?
A. Provides a consistent event interface across different browsers
B. Contains information necessary for event propagation
C. Reduces the need for garbage collection
D. Normalizes browser inconsistencies
Đáp án: C
Giải thích: Cơ chế SyntheticEvent là lớp bọc bên ngoài các sự kiện gốc của trình duyệt giúp chuẩn hóa sự bất đồng bộ giữa các nhân trình duyệt khác nhau (A, B, D). Tính năng này không can thiệp hay được phát minh để phục vụ việc tối ưu hóa chu kỳ gom rác tự động (Garbage Collection) của bộ máy JavaScript V8.

What does the render method in a React component do?
A. It manages state updates
B. Ithandles side effects
C. It returns the JSX that describes the UI
D. It fetches data from an API
Đáp án: C
Giải thích: Trách nhiệm duy. nhất của phương thức render() (hoặc câu lệnh return trong các hàm chức năng component) là trả về cầu trúc cây Virtual DOM dưới dạng ngôn ngữ đánh dau JSX dé mô tả chính xác diện mạo giao diện người dùng cần được vẽ ra màn hình.

What is a key differentiating characteristic of Tailwind CSS compared to traditional CSS frameworks like Bootstrap, as described in the sources?
A. It provides a comprehensive set of pre-built components for rapid development
B. It enforces strict design patterns to maintain visual consistency.
C. It offers a huge list of utility CSS classes, providing more freedom for custom designs
D. It relies heavily on JavaScript for styling and layout management.
Đáp án: C
Giải thích: Triết lý thiết kế của Tailwind CSS là mô hình tiện ích trước tiên (utility-first). Thay vì đóng gói sẵn các component hoàn chỉnh và áp đặt sẵn giao diện như Bootstrap, Tailwind cung cap hàng loạt lớp tiện ích nguyên tử (low-level utility classes) giúp lập trình viên tự do sáng tạo kiểu dáng giao diện tùy biến riêng biệt.

Nextjs is primarily used for:
A. Styling static websites
B. Creating server-rendered or statically generated React applications
C. Managing back-end databases
D. Handling real-time communication
Đáp án: B
Giải thích: Nextjs được sinh ra làm một meta-framework cao cấp xây dựng bên trên nền tảng React với mục đích tối cao là cung cắp giải pháp kết xuất mã nguồn phía máy chủ (Server-Side Rendering - SSR) và tao trang tĩnh tự động (Static Site Generation - SSG).

In Next.js, what mechanism primarily determines the routes in an application?
A. Explicit configuration in a central routes json file.
B. File-system routing, where routes are determined by the structure of files
C. Dynamic route declarations using React Router
D. Server-side API endpoints only
Đáp án: B
Giải thích: Khác hoàn toàn với React Router can khai báo thủ công các thẻ cấu hình, Nextjs thiết lập cơ chế định tuyến dựa trên hệ thống tệp tin (File-system routing). Nghĩa là cầu trúc thư mục và tên các tệp đặt trong thư mục đặc biệt (pages hoặc app) sẽ tự động chuyển hóa thành các đường link URL tương ứng của trang web.

How does Next js's server-side rendering capability primarily benefit web applications?
A. By offloading all rendering tasks to the client's browser
B. By eliminating the need for any server infrastructure
C. By resulting in faster initial page load times and better search engine optimization (SEO)
D. By simplifying complex client-side state management.
Đáp án: C
Giải thích: Do mã HTML hoàn chỉnh được biên dịch sẵn ngay tại máy chủ trước khi gửi về cho khách hàng, người dùng sẽ lập tức nhìn thay nội dung trang web mà không cần đợi chạy các file script lớn (giảm TTI), đồng thời các robot tìm kiếm có thể dễ dàng quét nội dung text giúp nâng cao chỉ số SEO đáng kể.

If you wanted to customize the size of the form controls, what would you do in Bootstrap5?
A. Set width in inline CSS
B. Use the rows and cols attributes for all form elements
C. Use the size variants of the form-control class, like form-control-sm or form-control-lg
D. Apply custom JavaScript functions
Đáp án: C
Giải thích: Bootstrap 5 cung cắp các lớp bổ trợ kiểm soát kích thước chuẩn hóa có tính kế thừa ngữ nghĩa trực tiếp cho các 6 nhập liệu, bao gồm form-control-sm (kích thước nhỏ) và form-control-lg (kích thước lớn), giúp lập trình viên định cỡ giao diện đồng bộ mà không cần viết CSS tùy biến.

How do you create a responsive grid layout using Bootstrap?
A. By using the <grid> element.
B. By applying the responsive-grid class to the container element.
C. By using the row and col-* classes to create rows and columns.
D. By manually specifying the width of each element using CSS.
Đáp án: C
Giải thích: Để thiết lập một mạng lưới hiển thị thích ứng (responsive grid) theo chuẩn Bootstrap, lập trình viên phối hợp sử dụng các class .row để định hình dòng flexbox, kết hợp các class phân chia cột có hậu tố kích thước co giãn màn hình .col-Ÿ (vi dụ: col-md-6, col-Ig-4).

Which of the following components can be used to create a slideshow in Bootstrap?
A. popover
B. modal
C. carousel
D. nav-pills
Đáp án: C
Giải thích: Component carousel là thành phan giao dién tich hop sẵn cau trúc trượt và hiệu ứng chuyển động của Bootstrap, được thiết kế chuyên biệt cho việc. hiển thị chuỗi trình chiếu ảnh hoặc slide nội dung tuân tự.

What does the useNavigate hook return?
A. An object with navigation methods.
B. A navigate function that can be used to navigate to a new location
C. A boolean indicating navigation status
D. A string representing the current route.
Đáp án: B
Giải thích: Trong thư viện React Router v6, thực thi hook useNavigate() sẽ trả về duy nhất một đối tượng hàm (đặt tên phổ biến là navigate). Hàm này dùng dé thực thi các lệnh chuyển đổi trang hoặc định tuyến một cách chủ động bằng mã lệnh (programmatic navigation).

How do you define a dynamic route parameter in React Router?
A. <Route component="{UserProfile}" path="/user/id"/>
B. <Route component="{UserProfile}" path="/user/:id"/>
C. <Route component="{UserProfile}" path="/user?=id"/>
D. <Route component="{UserProfile}" path="/user=(id)"/>
Đáp án: B
Giải thích: Cú pháp chuẩn mực của bộ thư viện React Router quy định việc đặt dấu hai chấm : đứng ngay trước định danh của biến tại thuộc tính đường dẫn (path="/user/:id") để thông báo cho hệ thống hiểu đây là một tham số định tuyến động.

What does the fallback prop in Suspense represent?
A. The component to display while the lazy component is loading
B. The component to display when an error occurs during loading
C. The component to display when the lazy component is rendered
D. The component to display when Suspense is not supported
Đáp án: A
Giải thích: Thuộc tinh fallback của cấu trúc <Suspense> đóng vai trò làm giao diện thay. thế tạm thời. Giao diện này sẽ hiển thị lên màn hình ngay trong khoảng thời gian hệ thống đang đợi tải xuống các file chunk mã nguồn của lazy component từ máy chủ về.

What is the main purpose of code splitting in a React application?
A. To make the code easier to read
B. To bundle all components into a single large file
C. To reduce the initial load time by loading parts of the app only when needed
D. To split CSS and JavaScript into separate files
Đáp án: C
Giải thích: Kỹ thuật chia nhỏ mã nguồn (Code Splitting) giúp băm tệp bundle tổng thành nhiều gói nhỏ, cho phép ứng dụng trì hoãn việc tải các trang chưa dùng tới, giúp giảm dung lượng tệp script tải xuống trong lần đầu tiên truy cập. nhằm tăng tốc độ tải trang tối đa.

In a React function component, how do you access a prop named "name" that is passed from a parent component?
A. this.props.name
B. props.name
C. useState.name
D. getProps() name
Đáp án: B
Giải thích: Vì Functional Component tiếp nhận toàn bộ các thuộc tính truyền từ ngoài vào thông qua tham sé (argument) đầu vào dau tiên của hàm dưới dạng một đối tượng đại diện tên là props, do đó ta truy cap trực tiếp giá trị của nó bằng cú pháp cham: props.name.

Nhiều Gap an dùng Which of the following are valid ways to initialize and manage state in a functional React component? (Choose 2 correct answers)
A. Using the useState hook.
B. Using the useReducer hook.
C. Using a Provider component.
D. Using the useRef hook.
Đáp án: A, B
Giải thích: Trong kỷ nguyên Functional Component của React, chỉ duy nhat hai bộ Hooks tích hợp sẵn là useState (quản lý trạng thái đơn lẻ) và useReducer (quản lý trang thái theo dạng máy trạng thái/phức tạp) được thiết kế có khả năng lưu giữ giá trị và kích hoạt luồng render lại giao diện khi có biến động dữ liệu. (useRef lưu dữ liệu nhưng không gây re-render).

Which of the following is acommon use case for using Redux in a React application?
A. Managing authentication and user sessions
B. Styling and layout of React components
C. Handling form validation and input tracking
D. Implementing server-side rendering in React
Đáp án: A
Giải thích: Redux được thiết kế tối ưu nhất dé quản lý các trạng thái toàn cục (global state) dùng chung bởi rất nhiều component không có quan hệ cha-con trực tiếp, điển hình là trạng thái đăng nhập và phiên làm việc của người dùng.

Which hook is typically used alongside useSelector to modify the Redux state?
A. useState
B. useEffect
C. useDispatch
D. useContext
Đáp án: C
Giải thích: Để thay đổi trang thái trong Redux Store, ta bắt buộc phải gửi đi (dispatch) một hành động. Hook useDispatch cung cắp chính xác hàm điều phối này trong các functional component.

What is the purpose of the Redux middleware in React applications?
A. To handle asynchronous actions and side effects
B. To define the structure of the Redux store
C. To connect React components to the Redux store
D. To manage component hierarchy
Đáp án: A
Giải thích: . Redux Middleware (như Redux Thunk) là lớp trung gian đứng giữa thời điểm action được kích hoạt và lúc nó chạm tới reducer, đóng vai trò cốt lõi trong việc đánh chặn để xử lý các logic bat đồng bộ hoặc gọi API.

What is the core principle of Redux?
A. Single source of truth and unidirectional data flow.
B. Multiple sources of truth for each component.
C. State is mutable and can be directly modified.
D. State is only updated using the useState hook.
Đáp án: A
Giải thích: Triết lý nền tảng của Redux dựa trên ba nguyên lý: toàn bộ trạng thái hệ thống nằm ở một kho duy nhất (Single source of truth), trạng thái mang tính chỉ đọc (immutable) và dữ liệu chuyển dịch theo luồng một chiều nghiêm ngặt.

What is the advantage of using Axios over fetch?
A. Axios has better support for handling requests and responses.
B. Axios requires less boilerplate code.
C. Axios is faster than fetch for all types of HTTP requests.
D. Axios does not support promises.
Đáp án: B
Giải thích: Axios tự động hóa việc chuyển đổi dữ liệu sang định dạng JSON (automatic JSON transformation) và cung cấp cơ chế bắt lỗi HTTP trực quan, giúp giảm thiểu tối đa lượng mã nguồn lặp đi lặp lại (boilerplate) so với Fetch API gốc.

What is the main purpose of the await keyword within an async function?
A. To return a new Promise object.
B. To immediately execute the next line of code without waiting.
C. To pause the execution of the async function until the Promise it's waiting for is resolved or rejected.
D. To define a synchronous block of code
Đáp án: C
Giải thích: . Từ khóa await tạm dừng luồng chạy của hàm async tại dòng đó để đợi Promise xử lý xong, giúp lập trình viên viết và đọc các tác vụ bat đồng bộ theo phong cách tuần tự trực quan của mã đồng bộ.

Why would a React developer choose to use "Axios"?
A. To render React components faster
B. To manage component state globally
C. To make HTTP requests to APIs
D. To build reusable hooks
Đáp án: C
Giải thích: Axios là một thư viện HTTP client phổ biến dựa trên Promise, được cài đặt vào dự án chuyên dụng cho việc thực hiện các yêu cầu giao. tiếp dữ liệu (HTTP requests) tới máy chủ mạng API.

Which method is most commonly used in a React app to fetch data from a server?
A. WebSockets
B. useState()
C. fetch or axios inside useEffect()
D. console.logO inside render()
Đáp án: C
Giải thích: Việc gọi API mạng từ máy chủ được phân loại là một Side Effect (tác vụ bên lề). Do đó, quy trình chuẩn mực của React là thực thi fetch hoặc axios đặt trong hook quản lý vòng đời useEffect.

Which of the following is used to pass a function from a parent component to a child component?
A. Passing a function as a prop to the child component.
B. Using useState hook in the child component.
C. Using useContext in both parent and child components.
D. Directly accessing the child component's state.
Đáp án: A
Giải thích: Do dữ liệu trong React dịch chuyển một chiều từ trên xuống, ta có thể truyền một hàm xử lý (callback function) như một thuộc tính (prop) bình thường từ cha xuống con đề cấu hình cho con kích hoạt khi cần thiết.

What happens when you use the xs prop on a Col component in React-Bootstrap?
A. The column will only have its width defined on extra-large screens.
B. The column will only have its width defined on extra-small screens, and larger sizes will ignore it
C. The column will have its width defined on extra-small screens and will apply to larger sizes if no specific breakpoint is defined.
D. The xs prop does not exist in React-Bootstrap
Đáp án: C
Giải thích: Hé thống Grid của Bootstrap vận hành theo tư duy ưu tiên thiết bị di động (Mobile-first). Mọi cấu hình độ rộng đặt ở thuộc tính màn hình siêu nhỏ (xs) sẽ tự động kế thừa lên tắt cả kích thước màn hình lớn hơn trừ khi bị một breakpoint lớn hơn ghi đè.

How can you ensure that a prop is passed as an array with at least one element?
A. By using PropTypes.array.isRequired
B. By creating a custom PropType validator
C. By using PropTypes.arrayOf()
D. By using PropTypes.objectOf()
Đáp án: B
Giải thích: Các hàm kiểm định mặc định của thư viện PropTypes chỉ kiểm tra được kiểu dữ liệu hoặc tính bắt buộc của mảng mà không kiểm tra được độ dài thực tế của phan tử bên trong mảng đó (Slength > O$). Do đó ta phải tự định nghĩa một hàm validator tùy biến (custom validator).

What is the primary purpose of a router in a web application?
A. To manage state within a component
B. To respond to a URL based on a set of route handler declarations
C. To handle server-side logic
D. To manage routing in a React application
Đáp án: B
Giải thích: Trách nhiệm cốt lõi của một hệ thống định tuyến (router) trong ứng dụng web là đồng bộ hóa thanh địa chi URL của trình duyệt, từ đó đối chiều hiển thị chính xác giao diện dựa vào danh sách cấu hình tuyến đường đã khai báo.

How do you declare a route in React Router?
A. Using <Link element="/<Home" path="*">} />
B. Using <Route element="{<Home" path="/"/>} />
C. Using <Routes element="(<Home" path="*/">)/>
D. Using <context path="></context></suspense></home>
Đáp án: B
Giải thích: Trong thư viện React Router v6, thẻ <Route> là cú pháp chuẩn mực quy định việc bắt cặp giữa thuộc tính path (đường dẫn định danh) và thuộc tính element (nhận vào một node JSX đại diện cho component sé render).

What is the difference between the HTTP response codes 401 and 403?
A. 401 the request is missing valid authentication credentials, while 403 the server refuses to authorize.
B. 401 the server encountered an internal error, while 403 means the requested resource was not found.
C. 401 the request was successful, while 403 means the request was not modified.
D. 401 and 403 are interchangeable and have the same meaning
Đáp án: A
Giải thích: Mã trạng thái 401 Unauthorized chỉ lỗi hệ thống không nhận dạng được danh tính người dùng (chưa xác thực/chưa đăng nhập). Trong khi mã 403 Forbidden phản hồi rằng hệ thống biết danh tính của bạn nhưng bạn hoàn toàn không có quyền hạn truy cập tài nguyên đó.

Which of the following is the correct way to use useSelector to access a value from the Redux store?
A. const value = useSelector((store) => store.value);
B. const value = useSelector((state) => state.value);
C. const value = useSelector((context) => contextvalue);
D. const value = useSelector((redux) => redux.value);
Đáp án: B
Giải thích: Cú pháp quy chuẩn của hook useSelector yêu cầu truyền vào một hàm chọn lựa (selector function). Hàm này nhận đối số mặc định đại diện cho toàn bộ cây trạng thái hiện hành của kho lưu trữ (state) để trích xuất dữ liệu.

What is the typical file extension for a React component?
A. html
B. .css
C. js or jsx
D. php
Đáp án: C
Giải thích: Thành phần giao diện trong React được xây dựng bằng cú pháp mở rộng phối hợp JavaScript và XML, do đó các tệp mã nguồn sẽ mang định dạng chuẩn là js hoặc chuyên biệt là jsx.

Nhiều đáp án đúng What is the purpose of React Fragment or shorthand <> </> in React? (Select all that apply)
A. Fragments allow you to group multiple elements without adding an extra node to the DOM.
B. Fragments allow you to provide CSS styling to multiple elements.
C. Fragments allow you to handle state management in React.
D. Fragments are particularly useful for avoiding unnecessary <div> elements, which can clutter your markup.
Đáp án: A
Giải thích: D. React Fragment được sinh ra nhằm mục đích gom nhóm danh sách các phần tử con đồng cấp lại mà không gây ảnh hưởng hay sinh ra một thẻ bao bọc vật lý du thừa (như <div>) trong cây cầu trúc DOM thật, giúp giữ cây markup sạch sẽ.

How can the useEffect hook be optimized for cleanup actions?
A. By passing an empty array as the second argument
B. By using a class-based component
C. By calling it after every render
D. By manually removing event listeners
Đáp án: A
Giải thích: Bằng cách truyền một mảng phụ thuộc rỗng [] làm tham số thứ hai, ta chỉ thị cho hook useEffect chỉ thực thi logic đúng một lần duy nhất sau lượt render đầu tiên, và hàm cleanup trả về từ nó cũng sẽ chỉ kích hoạt tối ưu một lần duy nhất khi com ponent bị hủy (unmount).

How would you use the useContext Hook to access a shared theme in a React component?
A. const theme = useContext(ThemeContext);
B. const (theme ) = useContext(ThemeContext);
C. const { theme } = useContext(ThemeContext.Provider);
D. const theme = useContext(ThemeContext.Provider);
Đáp án: A
Giải thích: Cú pháp chính thức của hook useContext yêu cầu lập trình viên phải truyền trực tiếp chính đối tượng ngữ cảnh được khởi tạo ban đầu (ThemeContext) vào làm đối số, tuyệt đối không truyền phan tử bao bọc định dạng .Provider.

Which of the following could cause an Effect to run too frequently?
A. Including all state variables in the dependency array.
B. Not using a dependency array.
C. Including a variable like data that changes often in the dependency array.
D. Omitting the dependency array altogether.
Đáp án: B
Giải thích: Nếu lập trình viên bỏ qua hoặc không khai báo tham sỐ mảng phụ thuộc (dependency array) cho useEffect, hàm hiệu ứng này sé bị ép buộc tái thực thi liên tục sau mọi chu ky render của component, dẫn đến việc chạy quá tần suất cần thiết.

Which of the following is NOT considered a popular front-end framework?
A. React
B. Angular
C. Django
D. Vuejs
Đáp án: C
Giải thích: Django là một framework mã nguồn mở nổi tiếng chuyên đảm nhận các logic nghiệp vụ xử lý dữ liệu ở phía máy chủ (Back-end) phát triển bằng ngôn ngữ Python, không thuộc nhóm thư viện/framework UI Front-end.

What is one major benefit of using front-end frameworks like React or Vue js?
A. They eliminate the need for HTML
B. They allow for faster development by providing pre-built components
C. They only work on mobile applications
D. They focus solely on server-side development
Đáp án: B
Giải thích: Lợi điểm lớn nhất của các giải pháp Front-end component-based hiện đại là khả năng tái sử dụng mã nguồn cao, cung cap cấu trúc phát triển đồng bộ giúp rút ngắn đáng kể tiền độ xây dựng ứng dụng phức tạp.

How can you access Chrome Dev Tools?
A. By pressing F12 or right-clicking and selecting "Inspect"
B. By installing a Chrome extension
C. By typing "chrome://devtools" in the address bar
D. By opening the Chrome menu and selecting "Dev Tools"
Đáp án: A
Giải thích: Lối tắt tiêu chuẩn trên mọi nền tảng trình duyệt lõi Chromium để mở bảng công cụ phát triển phần mềm DevTools là nhấn phím chức năng F12 hoặc thực hiện nhấp chuột phải trên màn hình rồi lựa chọn tác vụ Inspect (Kiểm tra).

How would you render a user's name dynamically inside an tag in JSX?
A. <h2> <p>{userName}</p> </h2>
B. <h2> {userName} </h2>
C. <h2> "userName" </h2>
D. <h2>{userName: "John"}</h2>
Đáp án: B
Giải thích: Trong cú pháp viết JSX, dé đưa bat kỳ một giá tri biến đồi hay một biểu thức tính toán động nào. của JavaScript hiển thị ra giao diện HTML, ta bắt buộc phải bao bọc biến đó bên trong cặp dấu ngoặc nhọn {userName}.

The purpose of JSX is to:
A. Make JavaScript code more readable by embedding HTML in JavaScript
B. Make JavaScript run faster
C. Encrypt HTML elements
D. Handle server-side logic
Đáp án: A
Giải thích: JSX (JavaScript XML) là một phần mở rộng cú pháp được thiết kế giúp trực quan hóa cau trúc giao diện người dùng bằng cách viết mã có diện mạo giống hệt HTML ngay bên trong môi trường logic JavaScript, cải thiện độ tường minh và dễ đọc của code.

What does ES6 introduce that is essential for React applications? (Select all that apply)
A. Arrow functions
B. Destructuring assignment
C. JSX syntax
D. Template Literals
Đáp án: A
Giải thích: BD. Các tính năng như hàm mũi tên (Arrow functions), phân rã đối tượng/mảng (Destructuring) và chuỗi ky tự động (Template Literals) đều thuộc đặc tả tiêu chuẩn ES6 và được ứng dụng liên tục trong React. Riêng cú pháp JSX là một công cụ riêng của hệ sinh thái React, không thuộc đặc tả ES6 gốc.

What is the main purpose of React-Bootstrap?
A. To build React components using jQuery
B. To use Bootstrap styles with inline CSS only
C. To provide Bootstrap-styled components built entirely with React
D. To convert Bootstrap HTML into Angular components
Đáp án: C
Giải thích: Thư viện react-bootstrap được phat triển nhằm mục đích tái cấu trúc toàn diện hệ thống UI của Bootstrap sang dạng các component thuần React, loại bỏ hoàn toàn sự phụ thuộc vào các đoạn mã JavaScript/jQuery truyền thống tác động trực tiếp vào DOM.

Which of the following is the first step in React's render cycle?
A. Triggering a render when state or props change.
B. Re-rendering the component.
C. Committing the changes to the DOM.
D. Calculating the minimal necessary updates for the DOM.
Đáp án: A
Giải thích: Bắt kỳ chu kỳ dựng hình (render cycle) nào của React cũng luôn được mở màn bằng một hành động kích hoạt (Triggering), xảy ra bắt cứ khi nào có sự thay đổi về mặt d ue tang đạo cu nội tai (state) hoặc đạo cụ truyền từ cha (props).

How can you pass parameters to an event handler in React? (Select all that apply)
A. Using the bind method.
B. Using arrow functions.
C. Using the addEventListener method.
D. Using the this keyword.
Đáp án: A, B, C
Giải thích: Để chuyển tiếp các đối số cụ thể vào hàm xử lý sự kiện trong JSX mà không làm hàm bị thực thi ngay khi render, lập trình viên có thể bọc lời gọi hàm bên trong một hàm mũi tên ẩn danh hoặc sử dụng phương thức nguyên bản .bind().

Cau 80/166 Đã chon 77/166 - Đã kiểm tra 77/166 - Đúng 77/77 What is the primary purpose of Next.js?
A. To enable server-side rendering and generate static websites.
B. To manage state in React applications
C. To provide a UI component library.
D. To create database schemas.
Đáp án: A
Giải thích: Next.js ra đời đóng vai trò là một production framework hoàn chỉnh kiến tạo trên lõi React nhằm cung cấp giải pháp dựng giao diện trực tiếp tại phía máy chủ (SSR) cùng khả năng biên dịch trang tĩnh (SSG) để tăng tốc độ tối đa cho ứng dụng.

What is the main advantage of Tailwind CSS compared to Bootstrap?
A. It provides more flexibility to create custom designs and components.
B. Itis easier to use and has fewer customization options.
C. It has predefined components for quick styling.
D. It offers faster page loading times.
Đáp án: A
Giải thích: Thay vì đóng gói cố định hình dáng UI theo các khuôn mẫu linh kiện định sẵn như Bootstrap, Tailwind CSS cung cấp hệ thống các utility class nguyên tử li tỉ, trao toàn quyền tự do thiết kế bố cục độc bản cho lập trình viên mà không sợ trùng lặp giao diện.

What command is used to create a new Next.js project?
A. npx create-react-app
B. npm install next
C. npx create-next-app
D. git clone nextjs
Đáp án: C
Giải thích: Trình chạy CLI chuẩn hóa được phân phối chính thức bởi đội ngũ Vercel để khởi tạo toàn diện một dự án cầu hình Nextjs khung cơ bản là công cụ npx create-next-app.

What is a core feature of Next.js that enhances SEO?
A. Real-time data fetching.
B. Client-side routing.
C. Automatic code splitting.
D. Server-side rendering.
Đáp án: D
Giải thích: Với tinh năng kết xuất phía máy chủ (Server-Side Rendering), máy chủ phản hồi về trình duyệt một file HTML chứa đầy đủ văn bản và cau trúc nội dung trang ngay lập tức, hỗ trợ tốt nhất cho các thuật toán thu thập dữ liệu (crawlers) của công cụ tìm kiếm chấm điểm SEO.

Which Bootstrap class is commonly used to create a responsive navigation bar?
A. navbar-static
B. nav-horizontal
C. navbar
D. navigation-block
Đáp án: C
Giải thích: Lớp nền tảng bắt buộc dé Bootstrap nhận diện, áp đặt kiểu dáng hiển thị thanh công cụ điều hướng thích ứng theo chiều rộng màn hình và quản lý các hành vi thu gọn (collapse) là lớp danh định .navbar.

Which class is used to create a form input with a validation state in Bootstrap 5?
A. form-control
B. input-group
C. form-check
D. form-validation
Đáp án: A
Giải thích: Lớp form-control được áp dụng trực tiếp cho các thẻ <input> để định hình kiểu dáng ô nhập liệu. Khi biểu mẫu kết hợp trạng thái kiểm thử dữ liệu (validation), lớp này sẽ tự động thay đổi viền màu (xanh/ đỏ) dựa vào các class phụ trợ như .is-valid hoặc .is-invalid.

Which Bootstrap class provides a fluid container that adapts to all breakpoints?
A. container-fluid
B. container
C. container-lg
D. container-xs
Đáp án: A
Giải thích: Sử dụng lớp .container-fluid đảm bảo rằng chiều rộng của khối bao bọc đó sẽ luôn luôn tự động kéo giãn phủ kin 100% diện tích chiều ngang khung nhìn của thiết bi (width: 100%) tại mọi điểm ngắt kích thước màn hình.

Why should you avoid using too many lazy components in your application?
A. Because it results in multiple HTTP requests, slowing down the application.
B. Because it decreases the performance by loading everything upfront.
C. Because it makes the code difficult to debug
D. Because it affects the layout and styling of components.
Đáp án: A
Giải thích: Việc chia nhỏ tệp bundle một cách thái quá thông qua React.lazy sẽ biến ứng dụng thành vô sé mảnh nhỏ riêng biệt. Khi người dùng điều hướng qua lại, trình duyệt buộc phải liên tục khởi tạo một lượng lớn các yêu cầu tải mang (HTTP requests) đơn lẻ, dễ gây nghẽn và làm chậm phản hồi UI.

How would you extract and display multiple parameters, userld and postld, ina component?
A. const { userld, postld } = useParams();
B. const userld = useParams("userld"); const postld = useParams("postid");
C. const userld = route.params.userld; const postld = route.params.postld;
D. const { userld } = useParams(); const { postld } = useParams();
Đáp án: A
Giải thích: Hook useParams() từ thư viện React Router trả về một đối tượng JavaScript duy nhất bao gồm tập hợp toàn bộ các cặp khóa/giá trị tham lộng trích xuất từ URL. Do đó, cú pháp chuẩn xác và tinh gọn nhat dé lầy dữ liệu ra là dùng kỹ thuật giải cấu trúc đối tượng (Destructuring).

How would you navigate programmatically to a route with a parameter using useNavigate in React Router?
A. navigate("/user:id");
B. navigate("/user?id=123");
C. navigate("/user/123");
D. navigate({ path: "/user/123" });
Đáp án: C
Giải thích: Khi sử dụng hàm điều hướng chủ động được trả về từ useNavigate(), lập trình viên cần truyền vào một chuỗi ký tự mô tả chính xác đường dẫn tuyệt đối cuối cùng cần nhảy đến, trong đó phần tham số đã được điền sẵn giá trị cụ thé (ví dụ: "/user/123").

In the useEffect hook, how many milliseconds would you wait using setTimeout to perform a side effect after 2 seconds?
A. 2
B. 200
C. 2000
D. 20000
Đáp án: C
Giải thích: Hàm đếm ngược thời gian setTimeout tích hợp sẵn của JavaScript sử dụng hệ thống đo lường thời gian trễ có đơn vị tính mặc định là mili-giây (milliseconds). Theo quy đổi toán học chuẩn: $2 \text{ giây = 2 \times 1000 = 2000 \text{ ms}S.

Which is the correct way to consume context in a functional component using the "useContext" hook?
A. const value = MyContext;
B. const value = useContext(MyContext);
C. const value = this.context(MyContext);
D. <MyContext.Provider useContext="{value}">
Đáp án: B
Giải thích: Phương thức quy chuẩn duy nhất trong các functional component của React để tiếp nhận dữ liệu từ một Context dùng chung là gọi thực thi hook useContext() và trực tiếp truyền đối tượng Context gốc (MyContext) vào làm tham số đầu vào.

In React Router, how do you define a nested route structure within a parent component?
A. Utilize the <Switch> component to handle nested routes
B. Implement a routing table using an array of route objects
C. Use the <Route> component with nested <Route> components
D. Direct routes using query parameters in URL path names
Đáp án: C
Giải thích: Kể từ phiên bản React Router v6, giải pháp chính thống để xây dựng cấu trúc định tuyến lồng nhau (Nested Routing) nhằm phục vụ hiển thị bồ cục lặp lại (Layout Component) là viết các thẻ <Route> con lồng trực tiếp vào bên trong phạm vi thẻ đóng/mở của thẻ <Route> cha tương ứng.

const server = jsonServer.create(); const router = jsonServer.router('data.json'); const port = 3000; server.use(router); server.listen(port, () => console.log(`JSON server is running on port ${port}`)); What is the above code used for?
A. Create a dynamic server to serve JSON data.
B. Create a dynamic web application using JSON data.
C. Create a JSON file based on data from the server.
D. Configure the development environment for the project using JSON.
Đáp án: A
Giải thích: (Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án A.)

How do you dispatch an action when a button is clicked?
A. const handleClick = () => { dispatch({ type: 'BUTTON_CLICKED' }); }; <button onClick={handleClick}>Click me</button>;
B. const handleClick = () => { dispatch({ type: 'BUTTON_CLICKED' }); }; <button onClick={() => handleClick()}>Click me</button>;
C. const handleClick = () => { dispatch({ type: 'BUTTON_CLICKED' }); }; <button onClick={handleClick()}>Click me</button>;
D. const handleClick = () => { dispatch({ action: 'BUTTON_CLICKED' }); }; <button onClick={handleClick}>Click me</button>;
Đáp án: A
Giải thích: (Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án A.)

Why might this code produce unexpected results? function Counter() { const [count, setCount] = useState(0); const handleClick = () => { setCount(count + 1); setCount(count + 1); }; return <button onClick={handleClick}>{count}</button>; }
A. Because setCount is called twice, it resets state
B. Because setCount merges the updates automatically
C. Both setCount(count + 1) calls use the same snapshot of count
D. It's invalid to call setCount twice
Đáp án: C
Giải thích: (Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án C.)

Find the bug in the following React code: const [items, setItems] = useState([]); const addItem = () => { items.push('new'); };
A. useState should be useReducer
B. use setItems([...items, 'new'])
C. push is not a valid method
D. setItems must take a string
Đáp án: B
Giải thích: (Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án B.)

JSX in React stands for:
A. JavaScript XML.
B. Java Syntax Extension
C. JavaScript Executive Extension
D. JSON Extension
Đáp án: A
Giải thích: Về mặt thuật ngữ, JSX là viết tắt của JavaScript XML. Đây là một phần mở rộng cú pháp mở cho phép lập trình viên viết các cầu trúc giống hệt mã HTML trực tiếp trong tệp mã nguồn JavaScript.

Understand the role of the render method in JSX. Which of the following best explains its use?
A. The render method is used to compile JSX into JavaScript.
B. The render method is used to convert JSX into HTML and render it to the DOM.
C. The render method is used to manage state in React components.
D. The render method is used to handle routing in React applications.
Đáp án: B
Giải thích: Nhiệm vụ cốt lõi của phương thức render() (trong Class Component) là chuyển đổi câu trúc khai báo cây Virtual DOM dưới dạng JSX thành mã HTML vật lý dé chèn và hién thị trực tiếp lên cây cầu trúc DOM của trình duyệt.

To specify that a property must be provided and must have a specific type in PropTypes, what is appended to the type validator?
A. optional
B. default
C. .isRequired
D. .mustExist
Đáp án: C
Giải thích: Thuộc tính bổ trợ .isRequired được gắn liền phía sau các trình kiểm định kiểu dữ liệu của thư viện PropTypes dé ràng buộc rằng prop đó bắt buộc phải được thành phan cha truyền xuống khi khởi tạo.

Which pair of Git commands is used to create a new branch and then switch to it?
A. git new branch-name; git change branch-name
B. git branch branch-name; git checkout branch-name
C. git make branch-name; git switch branch-name
D. git create branch-name; git select branch-nam
Đáp án: B
Giải thích: Trong hệ thống quản lý mã nguồn Git, câu lệnh git branch <tên_nhánh> đảm nhận việc khởi tao một nhánh rẽ mới, và lệnh git checkout <tên_nhánh> dùng để di chuyển vùng làm việc hiện hành sang nhánh đó.

What is async/await in JavaScript?
A. It is a JavaScript feature that makes asynchronous code look and behave like synchronous code.
B. Itis used to send data to a server without blocking the UI.
C. Itis a way to handle callback functions.
D. Itis amethod to manage state in React components.
Đáp án: A
Giải thích: Cú pháp async/await hoạt động như một lớp bọc cú pháp (syntactic sugar) cao cấp bên trên Promise, cho phép lập trình viên tổ chức viết mã xử lý bat đồng bộ theo phong cách tuân tự phẳng, dễ đọc như mã đồng bộ.

What is the main feature of Tailwind CSS compared to other CSS frameworks?
A. It provides pre-designed UI components and themes
B. It uses a utility-first approach, allowing developers to build custom designs using small utility classes
C. It provides pre-built JavaScript components
D. Itis a framework specifically for mobile development
Đáp án: B
Giải thích: Tailwind CSS nổi bật hoàn toàn nhờ triết lý thiết kế hướng tiện ích (utility-first), cung cp hệ thống các lớp CSS nguyên tử đơn nhiệm để chắp vá giao diện linh hoạt, giúp tối ưu hóa khả năng tùy biến thiết kế.

Which React Router component is commonly used to perform client-side navigation without triggering a full page reload?
A. <Router>
B. <Routes>
C. <Link>
D. <Route>
Đáp án: C
Giải thích: Component <Link> được dùng dé thay thé thẻ <a> thuần trong ứng dung Single Page Application (SPA), giúp chặn hành vi tải lại toàn trang của trình duyệt và thực hiện chuyển hướng cục bộ ngay tại client.

Next.js is primarily used for:
A. Styling static websites
B. Creating server-rendered or statically generated React applications
C. Managing back-end databases
D. Handling real-time communication
Đáp án: B
Giải thích: Meta-framework Nextjs phát triển các giải pháp kiến trúc nâng cao chạy trên nền tảng React với mục tiêu hàng dau là hỗ trợ các công nghệ kết xuất phía máy chủ (SSR) và biên dịch trang tĩnh trước (SSG).

What is JSX in React primarily used for?
A. Defining server-side logic and database queries
B. Describing the user interface structure and embedding HTML-like markup directly within JavaScript code.
C. Managing application-wide state using a global store
D. Optimizing image loading and asset management
Đáp án: B
Giải thích: Bản chất tối cao của ngôn ngữ JSX là cung cắp phương thức mô tả trực quan cầu trúc giao diện (UI layout) bằng cách cho phép nhúng trực tiếp các thẻ khai báo dạng mô phỏng HTML vào trong dòng mã logic JavaScript.

What happens if you forget to add key to items in a list rendered with map()?
A. React will not render the list at all.
B. React will display a warning in the console about missing keys.
C. React will automatically assign keys to each item.
D. React will throw an error and stop rendering the component.
Đáp án: B
Giải thích: Khi thiếu khóa phân định key độc nhất cho các phan tử duyệt mảng, công cụ Virtual DOM của React vẫn sẽ kết xuất giao diện bình thường nhưng sẽ in một dòng cảnh báo (warning) lên cửa sổ console của trình duyệt để nhắc nhở tối ưu.

Which of the following statements about reducers in Redux is true?
A. Reducers can only be used with React class components, not functional components.
B. Reducers are responsible for dispatching actions.
C. Reducers should have side effects such as API calls or database interactions.
D. Reducers must be pure functions with no side effects.
Đáp án: D
Giải thích: Theo quy chuẩn thiết kế Redux, các hàm reducer bắt buộc phải tuân thủ nghiêm ngặt nguyên ly hàm thuần khiết (pure functions): chỉ nhận trạng thái cũ cùng hành động để tính toán trạng thái mới mà không sinh ra tác vụ phụ.

What is Redux Thunk used for?
A. To manage asynchronous actions in Redux.
B. To log every action dispatched to the Redux store.
C. To split reducers into simpler functions.
D. To handle side effects in React components.
Đáp án: A
Giải thích: Middleware Redux Thunk cho phép các lập trình viên viết các hàm phát sinh hành động (action creators) trả về một hàm thực thi thay vì một đối tượng đơn thuần, giúp xử lý các logic bat đồng bộ (gọi API) một cách dễ dàng.

How can you define a lazy component in React?
A. Using the lazy function from the React library
B. Wrapping the component in the LazyComponent higher-order component
C. Importing the component with the lazy keyword
D. Using the createLazyComponent method from the React package
Đáp án: A
Giải thích: . Cú pháp quy chuẩn của React dé thực hiện thiết lập tải chậm (lazy loading) thành phan giao diện là sử dụng hàm khởi tạo lazy() do chính thư viện cốt lõi react cung cắp sẵn đi kèm cú pháp gọi import() động.

What would happen if you didn't include the class="form-control" in your element?
A. The input would not be submitted with the form
B. The input would fail client-side validation
C. The input field would revert to the browser's default styles
D. The input field would become non-responsive
Đáp án: C
Giải thích: Lớp tên form-control chịu trách nhiệm quy định phong cách hiển thị biểu mẫu chuẩn của hệ thống Bootstrap. Nếu loại bỏ nó, ô nhập liệu <input> sẽ ngay lập tức bị tước bỏ giao diện của Bootstrap và quay về định dạng thô của trình duyệt.

Which HTTP method is typically used in a fetch request to retrieve data from a server?
A. POST
B. GET
C. PUT
D. DELETE
Đáp án: B
Giải thích: Theo các nguyên tắc ràng buộc của kiến trúc RESTful chuẩn, phương thức HTTP mang tên GET là công cụ duy nhất mang ngữ nghĩa yêu cầu máy chủ tìm kiếm, truy xuất và phản hồi tệp thông tin dữ liệu về cho phía máy khách.

What is a Higher-Order Component (HOC) in React?
A. A component that has a higher visual hierarchy than others.
B. A function that takes a component as an argument and returns a new component with enhanced functionality
C. A component that only renders other components without any logic of its own
D. A built-in React component for advanced routing
Đáp án: B
Giải thích: Higher-Order Component (HOC) tuân thủ mô hình thiết kế nâng cao trong lập trình hàm: Nó đóng vai trò là một hàm nhận vào một component nền tảng ban đầu làm tham số và xuất bản ra một component mới đã được nâng cắp thêm các tang xử lý logic nâng cao.

How are PropTypes typically integrated into a functional React component?
A. By declaring them within the component's return statement
B. By installing react-proptypes and using this.props.propTypes inside the function
C. By defining a propTypes property on the component function itself, usually after its declaration, to specify prop type definitions
D. PropTypes cannot be used with functional components
Đáp án: C
Giải thích: Cách thức gắn bộ kiểm thử kiểu dữ liệu PropTypes vào cấu trúc Functional Component là khai báo gán trực tiếp thuộc tính mở rộng .propTypes lên chính đối tượng hàm của thành phần đó ngay sau khi định nghĩa xong khối hàm.

What is React?
A. A programming language
B. A JavaScript library for building user interfaces
C. Adatabase management system
D. Aweb browser
Đáp án: B
Giải thích: Căn cứ theo đúng định nghĩa ghi nhận tại trang tài liệu hướng dẫn chính thức từ Facebook, React là một thư viện mã nguồn mở viết trên ngôn ngữ JavaScript chuyên dụng cho tác vụ kiến tạo giao diện người dùng (UI).

Which two recent additions to React allow the complete integration of code splitting into applications?
A. useState() and useEffect()
B. React.memo() and useCallback()
C. lazyQ API and Suspense components
D. ReactDOM.createRoot() and BrowserRouter.
Đáp án: C
Giải thích: Việc tích hợp tính năng phân tách tệp mã nguồn đóng gói (code splitting) trong hệ sinh thái React được vận hành đồng bộ nhờ bộ đôi: hàm điều hướng tải thành phần động lazy() phối hợp cùng thẻ kiểm soát trang thái chờ <Suspense>.

What is the primary goal of decoupling route declarations in a React Router application?
A. To improve the organization and maintainability of the code by separating routes into larger, more manageable modules.
B. To enhance the security of the application by separating sensitive routes from public routes.
C. To enable the use of dynamic routing and nested routes in the application.
D. To enhance code organization and maintainability by separating routes into smaller, more manageable modules.
Đáp án: D
Giải thích: Mục tiêu tối cao của kỹ thuật phân tách độc lập (decoupling) cấu trúc định tuyên là xé nhỏ hệ thống cầu hình tuyén đường phức tạp thành các phân vùng module nhỏ hơn (smaller), giúp nâng cao tính mạch lạc của mã nguồn và thuận tiện cho bảo trì.

What is the purpose of the action parameter in a Redux reducer function?
A. To define the structure of the Redux store
B. To specify the initial state of the reducer
C. To handle asynchronous operations
D. To describe the action being dispatched to the reducer
Đáp án: D
Giải thích: Tham số đầu vào mang tên action gửi vào hàm reducer đóng vai trò là một đối tượng mang thông tin đặc tả cụ thể hành động nào vừa được gửi di (dispatch), chứa thuộc tinh type định danh va dữ liệu bổ trợ payload nếu có.

Which component is used to create an input field in React-Bootstrap?
A. <Form.Text>
B. <Form.Control>
C. <Form.Caption>
D. <Form.Title>
Đáp án: B
Giải thích: Trong thư viện React-Bootstrap, <Form.Control> là component chuẩn hóa chuyên dụng dùng để render các ô nhập liệu (như input, textarea, select) và tự động tích hợp các lớp CSS responsive đi kèm.

Which of the following is a correct way to initialize multiple state variables using useState?
A. const [valuef, setValue1, value2, setValue2] = useState(O, 0);
B. const [value†, setValueT] = useState(O); const [value2, setValue2] = useState(O);
C. const [state, setState] = useState({ value: 0, value2: O });
D. const [valuel, value2, setValues] = useState(O, 0);
Đáp án: B
Giải thích: Khai báo nhiều biến trạng thái độc lập bằng cách tách biệt thành từng lời gọi useState riêng lẻ (phương án B) là mô hình thiết kế chuẩn khuyến nghị của React giúp mã nguồn tường minh và dễ quản lý việc cập nhật cục bộ.

What is the purpose of a package.json file in a Node.js project?
A. To store application data
B. To define routes for the web application.
C. To serve as documentation for project dependencies and their versions.
D. To compile JavaScript code.
Đáp án: C
Giải thích: Tệp package.json đóng vai trò như một bản kê khai kỹ thuật (manifest specifications) trọng tâm của dự án Nodejs, chịu trách nhiệm lưu trữ cấu hình siêu dữ liệu cùng danh sách các thư viện phụ thuộc (dependencies) và phiên bản chính xác của chúng.

What is the primary purpose of event handlers in React?
A. To manage state within a component
B. To respond to user interactions like clicking, hovering, and focusing
C. To handle server-side logic
D. To manage routing in a React application
Đáp án: B
Giải thích: Trách nhiệm cốt lõi của các hàm xử lý sự kiện (event handlers) trong lập trình Front-End là lắng nghe, đánh chặn và phan hồi trực tiếp lại các hành vi tương tác vật lý từ phía người dùng cuối như nhap chuột, di chuột hay tập trung tiêu điểm.

What is the purpose of the initial state parameter in a Redux reducer function?
A. To define the structure of the Redux store
B. To specify the actions that can be dispatched
C. To handle asynchronous operations
D. To define the initial state of the reducer
Đáp án: D
Giải thích: Tham số initialState cu ng cấp giá trị mặc định cho state khi ứng dụng khởi tạo lần đầu và Redux store gửi action khởi tạo mặc định.

Evaluate the benefits of using Redux Thunk middleware in a Redux application. Which of the following is NOT a benefit?
A. Allows for handling asynchronous actions
B. Simplifies the process of making API calls within action creators
C. Ensures that all actions are synchronous
D. Enables conditional dispatching of actions
Đáp án: C
Giải thích: Nhiệm vụ chính của Redux Thunk là cho phép viết các action creator trả về một hàm (thay vì một object) dé xử lý bat đồng bộ, do đó phát biểu "đảm bảo mọi action đều đồng bộ" là sai.

Which of the following statements about Redux selectors is true?
A. Selectors are responsible for dispatching actions
B. Selectors are used to modify the Redux store directly
C. Selectors are pure functions that derive specific data from the Redux store
D. Selectors are only used in React class components
Đáp án: C
Giải thích: Selectors là các hàm thuần khiết được sử dụng để trích xuất, tính toán hoặc định dạng lại một phần dữ liệu cụ thé từ Redux store một cách tối ưu và an toàn.

How can you configure Tailwind CSS in a Next js project?
A. By importing a CSS file directly in the component.
B. By installing the Tailwind CSS package and creating a configuration file.
C. By using a CDN link in the HTML file.
D. By installing a Tailwind CSS plugin for Next js.
Đáp án: B
Giải thích: Đề cấu hình Tailwind CSS trong dự an Nextjs, quy trình chuẩn là cài đặt các thư viện cần thiết (tailwindess, postcss, autoprefixer) và khởi tạo file cấu hình tailwind.configjs.

What are the key features of Next js?
A. Server-side rendering, Static Site Generation, Image Optimization, Built-in Routing.
B. Database integration, code debugging, and form validation.
C. CSS styling, version control, and error handling
D. Package management, command-line interface, and testing framework.
Đáp án: A
Giải thích: sức mạnh của Nextjs bao gồm SSR (render phía server), SSG (tạo trang tĩnh), tự động tối ưu ảnh và hệ thống định tuyến theo thư mục.

Which method is used to update the state in a class component?
A. setState
B. useState
C. updateState
D. changeState
Đáp án: A
Giải thích: Trong Class Component của React, phương thức xây dựng sẵn this.setState() được dùng dé cập nhật trạng thái và kích hoạt quá trình re-render giao diện.

How do you define a Type validator in PropTypes for a prop called "age" that should be a number?
A. age: PropTypes.string
B. age: PropTypes.number
C. age: PropTypes.bool
D. age: PropTypes.object
Đáp án: B
Giải thích: Thư viện prop-types cung cắp validator PropTypes.number dé xác thực thuộc tính truyền vào bat buộc phải thuộc kiểu dữ liệu số (number).

What happens if a prop fails the validation defined by a simple property validator?
A. An error will be thrown during runtime.
B. The prop will be automatically converted to the expected type.
C. The component will continue to function normally.
D. The validation will be bypassed, and the prop will be accepted.
Đáp án: C
Giải thích: Khác với TypeScript, PropTypes chỉ ghi nhận và hiển thị một cảnh báo (warning) ở màn hình console trong môi trường phát triển (development) chứ không làm sập ứng dụng, component vẫn chạy. bình thường.

What is the purpose of PropTypes?
A. To ensure type safety in React components.
B. To improve performance in React applications.
C. To handle asynchronous operations in React.
D. To enable code reusability in React components.
Đáp án: A
Giải thích: PropTypes đóng vai trò kiểm tra kiểu dữ liệu (runtime type-checking) cho các props của component, giúp phát hiện sớm các lỗi truyền sai dữ liệu giữa các thành phan.

How do you create navigation links in React Router?
A. Using the Switch> component
B. Using the component
C. Using the «Route> component
D. Using the Navigate> component
Đáp án: B
Giải thích: Component <Link> được React Router cung cấp để tạo các liên kết điều hướng mượt mà trên client-side mà không gây ra hiện tượng reload lại toàn bộ trang web.

Which code snippet demonstrates how to handle a route parameter in React Router?
A. Route path="/users/:id" component={UserDetail} />
B. Users
C. import (BrowserRouter as Router, Route ) from "react-router-dom';
D. import ( Link, Route ) from "react-router-dom':
Đáp án: A
Giải thích: Tuyến đường chứa tham sỐ động (route parameter) bắt buộc phải được khai báo bằng thuộc tính path trong thẻ <Route>, các phương án còn lại chỉ là thẻ liên kết hoặc câu lệnh import.

What does the HTTP response code 404 indicate?
A. OK
B. Created
C. Not Found
D. Internal Server Error
Đáp án: C
Giải thích: Mã trạng thái HTTP 404 thuộc nhóm lỗi phía Client (Client Error), xác nhận rằng máy chủ không tìm thấy tài nguyên ứng với URL được yêu cầu.

What is the purpose of json-server in the context of setting up a server?
A. To handle user input and interactions.
B. To display the website content.
C. To provide a static web server for serving JSON data
D. To generate dynamic server responses.
Đáp án: C
Giải thích: json-server là công cụ gọn nhẹ giúp tạo nhanh một REST API giả lập từ một file JSON tĩnh, phục vụ đắc lực cho việc phát triển và kiểm thử giao diện Front-End.

What are Higher-Order Components in React?
A. Advanced components.
B. Components written in JavaScript.
C. Components with multiple props.
D. Components with multiple states.
Đáp án: A
Giải thích: Theo tài liệu chính thức của React, HOC là một kỹ thuật nâng cao (advanced technique) dùng để tái sử dụng logic của component, thực chất nó là một hàm nhận vào một component và trả về một component mới.

Which methods are part of the Lifecycle in Class Components?
A. componentDidMount, componentDidUpdate, componentWillUnmount.
B. render, setState, forceUpdate.
C. constructor, render, componentWillUpdate.
D. componentWillReceiveProps, shouldComponentUpdate, componentDidCatch.
Đáp án: A
Giải thích: Đây là bộ ba phương thức vòng đời kinh dién đại diện day đủ cho 3 giai đoạn chính của một Class Component: Khởi tao (Mounting), Cập nhật (Updating), và Hủy bỏ (Unmounting).

Which React hook is used to manage state in functional components?
A. useEffect
B. useContext
C. useState
D. useReducer
Đáp án: C
Giải thích: Hook useState là hook cơ bản và phổ biến nhất được thiết kế dé khai báo, lưu trữ và cập nhật các trang thái (state) cục bộ bên trong một Functional Component.

What are the differences between useState and useReducer Hooks in React?
A. useState is used for managing simple state, while useReducer is used for complex state and state transitions
B. useState is a built-in Hook, while useReducer is a custom Hook.
C. useState is used for class components, while useReducer is used for functional components.
D. useState is for local component state, while useReducer is for global application state.
Đáp án: A
Giải thích: useState phù hợp cho các trạng thái đơn lẻ, độc lập; trong khi useReducer tối ưu hơn khi quan lý các state phức tạp, có nhiều thuộc tính lồng nhau hoặc luồng cập nhật phụ thuộc vào logic action phức tạp.

How would you create a custom Hook in React?
A. By defining a function that uses other built-in Hooks.
B. By extending the React. Component class.
C. By wrapping a class component with a functional component.
D. By using the createCustomHook function.
Đáp án: A
Giải thích: Custom Hook đơn thuần là một ham JavaScript có tên bắt đầu bằng từ khóa use, dùng để đóng gói và tái sử dụng các logic trạng thái bằng cách gọi các Hook xây dựng sẵn khác của React.

How can you safely remove an unnecessary dependency from an Effect?
A. Remove all dependencies from the array.
B. Use an empty dependency array [] to ensure the Effect only runs once.
C. Keep all dependencies and accept performance issues.
D. Replace usEffect with useLayoutEffect.
Đáp án: B
Giải thích: Khi một dependency được xác định là không cần thiết cho việc re-run logic của Effect, việc chuyển về mảng rỗng [] sẽ đảm bảo Effect đó chỉ thực thi một lần duy nhất sau lượt render đầu tiên.

How can you access Chrome DevTools?
A. By pressing F12 or right-clicking and selecting "Inspect"
B. By installing a Chrome extension
C. By typing "chrome://devtools" in the address bar
D. By opening the Chrome menu and selecting "Dev Tools"
Đáp án: A
Giải thích: Nhắn phím F12 hoặc click chuột phải chon "Inspect" (Kiểm tra) là hai Idi tắt tiêu chuẩn và nhanh nhất được tích hop sẵn trên các trình duyệt Chromium để mở bảng công cụ DevTools.

What are the key features of React?
A. Two-way data binding
B. Virtual DOM
C. SOL database integration
D. Automatic styling
Đáp án: B
Giải thích: Virtual DOM (DOM ảo) là tính năng mang tính kiến trúc cốt lõi của React, giúp tăng tốc độ cập nhật giao diện bằng cách tính toán các thay đổi tồi thiểu trước khi đồng bộ lên Real DOM.

How can you configure Git with your name and email address?
A. By running "git config --global user.name "Your Name" and "git config --global user.email "Your Email"
B. By creating a gitignore file
C. By committing changes using "git commit -m"
D. By pushing changes to a remote repository
Đáp án: A
Giải thích: Cú pháp lệnh git config --global được dùng để thiết lập cấu hình định danh toàn cục cho tài khoản người dùng trên máy tính cá nhân làm việc với Git

Which feature of ES6 is used to iterate over the elements of an array?
A. Spread syntax
B. Destructuring assignment
C. Arrow functions
D. for...of loop
Đáp án: D
Giải thích: Vòng lặp for...of là cú pháp lặp mới được giới thiệu trong ES6 chuyên dùng để duyệt qua các giá trị của các đối tượng có cầu trúc lặp (iterable object) như Mang (Array).

How does the Grid component in React-Bootstrap help in creating a responsive layout?
A. The Grid component allows you to define a flexible grid system with rows and columns that automatically adjusts based on the screen size.
B. The Grid component provides pre-built responsive layouts that you can directly use in your application.
C. The Grid component automatically resizes and repositions the elements based on the available space.
D. The Grid component helps in aligning the elements vertically and horizontally on the page.
Đáp án: A
Giải thích: Hệ thống Grid trong React-Bootstrap (Container, Row, Col) áp dụng cơ ché flexbox kết hợp các breakpoint giúp chia màn hình thành 12 cột và tự động co giãn theo kích thước thiết bị.

Which React-Bootstrap components are used to create navigation menus?
A. Navbars, Navs, Tabs
B. Alert, Card
C. Button, Checkbox
D. Modal, Listbox
Đáp án: A
Giải thích: . Nhóm thành phan Navbar (thanh điều hướng), Nav (liên kết menu), va Tabs (tab chuyển đổi) là các Ul component chuyên biệt trong Bootstrap phục vụ mục đích xây dựng hệ thống menu dẫn hướng.

Which of the following is a utility-first CSS framework that is often used with Next.js?
A. Bootstrap
B. Material-UI
C. Tailwind CSS
D. Bulma
Đáp án: C
Giải thích: Tailwind CSS được định nghĩa chuẩn xác là một "utility-first CSS framework", cung cấp các class nhỏ gọn để dựng giao diện trực tiếp và là bộ đôi phổ biến nhất khi đi kèm Nextjs.

What is Tailwind CSS?
A. A JavaScript framework for building single-page applications.
B. A programming language used for backend development.
C. Autility-first CSS framework for building responsive web interfaces.
D. A database management system for storing CSS styles.
Đáp án: C
Giải thích: Định nghĩa chính thức của Tailwind CSS là mét framework CSS theo triết lý "utility-first" giúp lập trình viên Front-End thiết kế giao diện linh hoạt, phản hồi cao (responsive) một cách nhanh chóng.

Which of the following is a feature of Next.js?
A. ACSS framework for styling web applications.
B. A server-side rendering framework for React.
C. Astate management library for React applications.
D. A testing framework for JavaScript applications.
Đáp án: B
Giải thích: Khác biệt lớn nhất của Nextjs so với ứng dụng React thuần (SPA) là khả năng hỗ trợ đắc lực cơ chế kết xuất mã nguồn phía máy chủ (Server-Side Rendering).

What is the purpose of the next/link module in Next. js?
A. It is used for handling form submissions.
B. It provides client-side routing capabilities.
C. Itis responsible for server-side rendering.
D. It enables serverless function deployment.
Đáp án: B
Giải thích: Module next/link cung cấp component <Link> giúp kích hoạt tính năng điều hướng phía Client (client-side navigation), giúp việc chuyển trang diễn ra tức thì mà không cần load lại tài nguyên HTML.

How would you combine fluid and pixel widths behaviors in a grid layout using Bootstrap5?
A. Use container-fluid for the entire layout
B. Combine .container with col-fluid
C. Use a fixed-width class with a media query
D. Use container-md to apply a responsive container at the md breakpoint
Đáp án: D
Giải thích: Lớp .container-md có đặc tinh: Co giãn 100% chiều rộng (fluid) ở các màn hình nhỏ dưới mức md, nhưng khi đạt từ breakpoint md trở lên sẽ chuyển thành độ rộng pixel cố định (fixed width).

How does the Bootstrap grid system help in designing responsive websites?
A. By providing pre-designed website templates.
B. By automatically adjusting the font sizes based on the screen size.
C. By allowing the layout to adapt to different screen sizes using a 12-column responsive grid system.
D. By optimizing the website for search engines.
Đáp án: C
Giải thích: Bootstrap Grid sử dụng hệ thống lưới chia làm 12 cột linh hoạt phối hợp cùng Media Queries để cấu trúc lại giao diện hiển thị sao cho phù hợp nhất với mọi kích thước màn hình vật lý.

What would happen if you didn't include the class="form-control" in your element?
A. The input would not be submitted with the form
B. The input would fail client-side validation
C. The input field would revert to the browser's default styles
D. The input field would become non-responsive
Đáp án: C
Giải thích: Lớp form-control của Bootstrap đảm nhận việc áp các thuộc tính style (border, padding, focus state) cho thẻ input; thiếu nó, phần tử sẽ quay về định dang thô mặc định của trình duyệt hệ điều hành.

Which method is commonly used to transform an array of data into a list of components in React?
A. const items = ["Apple", "Banana", "Cherry"]; const listItems = items.filter(item => <li>{item}</li>);
B. const items = ["Apple", "Banana", "Cherry"]; const listItems = items.map(item => <li>{item}</li>);
C. const items = ["Apple", "Banana", "Cherry"]; const listItems = items.forEach(item => <li>{item}</li>);
D. const items = ["Apple", "Banana", "Cherry"]; const listItems = items.reduce(item => <li>{item}</li>);
Đáp án: B
Giải thích: (Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án B.)

Create a React component that uses the Suspense component to display a fallback while loading a lazily loaded component. Which code snippet is correct?
A. import React, { lazy, Suspense } from 'react'; const MyComponent = lazy(() => import('./MyComponent')); function App() { return ( <Suspense fallback={<div>Loading...</div>}><MyComponent /></Suspense> ); } export default App;
B. import React, { Suspense } from 'react'; const MyComponent = import('./MyComponent'); function App() { return ( <Suspense fallback={<div>Loading...</div>}><MyComponent /></Suspense> ); } export default App;
C. import React, { lazy } from 'react'; const MyComponent = lazy('./MyComponent'); function App() { return ( <div fallback={<div>Loading...</div>}><MyComponent /></div> ); } export default App;
D. import React from 'react'; const MyComponent = React.lazy(() => import('./MyComponent')); function App() { return ( <React.Suspense><MyComponent /></React.Suspense> ); } export default App;
Đáp án: A
Giải thích: Nguồn không cung cấp giải thích chi tiết, chỉ ghi nhận đáp án A: dùng lazy() để import động component và bọc nó trong <Suspense fallback={...}>.

const server = jsonServer.create(); const router = jsonServer.router('data.json'); const port = 3000; server.use(router); server.listen(port, () => console.log(`JSON server is running on port ${port}`)); What is the above code used for?
A. Create a dynamic server to serve JSON data.
B. Create a dynamic web application using JSON data.
C. Create a JSON file based on data from the server.
D. Configure the development environment for the project using JSON.
Đáp án: A
Giải thích: (Nguồn không cung cấp giải thích chi tiết cho câu này, chỉ ghi nhận đáp án A.)

Select the code snippet that correctly defines a Higher-Order Component in React using an arrow function with a named function.
A. function withLogger(WrappedComponent) { return class extends React.Component { /* HOC implementation */ } }
B. const withLogger = (WrappedComponent) => { return class extends React.Component { /* HOC implementation */ } }
C. const withLogger = (WrappedComponent) => { return function HOC() { /* HOC implementation */ } } }
D. function withLogger(WrappedComponent) { return function HOC() { /* HOC implementation */ }; }
Đáp án: C
Giải thích: Nguồn không cung cấp giải thích chi tiết, chỉ ghi nhận đáp án C: dùng arrow function bọc một named function HOC() bên trong.